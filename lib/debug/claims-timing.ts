import { AsyncLocalStorage } from "node:async_hooks";
import { isNavTimingEnabled } from "@/lib/debug/nav-timing";

type ClaimsTracker = {
  firstNetworkAt: number | null;
  refreshMs: number;
  jwksMs: number;
  getUserMs: number;
};

type FetchWrapState = {
  wrapper: typeof fetch | null;
  original: typeof fetch | null;
  saved: typeof fetch | null;
  count: number;
};

const FETCH_WRAP_KEY = Symbol.for("etkan.claimsTiming.fetchWrap");

/**
 * Shared across bundle copies (edge middleware + SSR) and HMR reloads so two
 * copies can never wrap each other into a self-calling fetch chain.
 */
function getFetchWrapState(): FetchWrapState {
  const host = globalThis as typeof globalThis & {
    [FETCH_WRAP_KEY]?: FetchWrapState;
  };
  host[FETCH_WRAP_KEY] ??= {
    wrapper: null,
    original: null,
    saved: null,
    count: 0,
  };
  return host[FETCH_WRAP_KEY];
}

const trackers = new AsyncLocalStorage<ClaimsTracker>();

let claimsInFlight = 0;

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function classifyAuthUrl(
  url: string
): "jwks" | "refresh" | "getUser" | "other" {
  const lower = url.toLowerCase();
  if (lower.includes("jwks.json")) return "jwks";
  if (lower.includes("/auth/v1/token")) return "refresh";
  if (lower.includes("/auth/v1/user")) return "getUser";
  return "other";
}

async function instrumentedFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const state = getFetchWrapState();
  const tracker = trackers.getStore();
  const dest = state.saved ?? state.original;
  if (!dest) {
    throw new TypeError("claims timing fetch wrapper has no delegate");
  }
  if (!tracker) {
    return dest(input, init);
  }

  const kind = classifyAuthUrl(requestUrl(input));
  const start = performance.now();
  if (tracker.firstNetworkAt == null && kind !== "other") {
    tracker.firstNetworkAt = start;
  }

  try {
    return await dest(input, init);
  } finally {
    if (kind !== "other") {
      const ms = performance.now() - start;
      if (kind === "jwks") tracker.jwksMs += ms;
      else if (kind === "refresh") tracker.refreshMs += ms;
      else tracker.getUserMs += ms;
    }
  }
}

function installFetchWrap() {
  const state = getFetchWrapState();
  state.wrapper ??= instrumentedFetch as typeof fetch;
  state.count += 1;

  if (globalThis.fetch !== state.wrapper) {
    state.saved = globalThis.fetch.bind(globalThis);
    state.original ??= state.saved;
    globalThis.fetch = state.wrapper;
  }
}

function uninstallFetchWrap() {
  const state = getFetchWrapState();
  state.count = Math.max(0, state.count - 1);

  if (state.count > 0) {
    return;
  }
  if (globalThis.fetch === state.wrapper && state.saved) {
    globalThis.fetch = state.saved;
  }
  state.saved = null;
}

/**
 * Time supabase.auth.getClaims() internals via Auth HTTP classification.
 * Does not change getClaims behavior. No-op when nav debug is off.
 */
export async function withClaimsTiming<T>(
  tripId: string,
  run: () => Promise<T>
): Promise<T> {
  if (!isNavTimingEnabled()) {
    return run();
  }

  const inFlightAtStart = claimsInFlight;
  claimsInFlight += 1;
  const t0 = performance.now();
  const tracker: ClaimsTracker = {
    firstNetworkAt: null,
    refreshMs: 0,
    jwksMs: 0,
    getUserMs: 0,
  };

  installFetchWrap();
  try {
    return await trackers.run(tracker, run);
  } finally {
    uninstallFetchWrap();
    claimsInFlight = Math.max(0, claimsInFlight - 1);

    const total = performance.now() - t0;
    const session =
      tracker.firstNetworkAt != null
        ? tracker.firstNetworkAt - t0
        : total;
    const verify =
      tracker.getUserMs > 0
        ? 0
        : Math.max(
            0,
            total -
              session -
              tracker.refreshMs -
              tracker.jwksMs
          );

    const jwks =
      tracker.jwksMs > 0 ? `MISS:${Math.round(tracker.jwksMs)}ms` : "HIT";
    console.info(
      `[NAV ${tripId}] claims_detail session=${Math.round(session)}ms refresh=${Math.round(tracker.refreshMs)}ms jwks=${jwks} verify=${Math.round(verify)}ms getUser=${Math.round(tracker.getUserMs)}ms in_flight=${inFlightAtStart}`
    );
  }
}
