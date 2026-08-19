import { AsyncLocalStorage } from "node:async_hooks";
import { isNavTimingEnabled } from "@/lib/debug/nav-timing";

type ClaimsTracker = {
  firstNetworkAt: number | null;
  refreshMs: number;
  jwksMs: number;
  getUserMs: number;
};

const trackers = new AsyncLocalStorage<ClaimsTracker>();

let claimsInFlight = 0;
let wrapCount = 0;
let savedFetch: typeof fetch | null = null;

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
  const tracker = trackers.getStore();
  const dest = savedFetch ?? fetch;
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
  if (wrapCount === 0) {
    savedFetch = globalThis.fetch.bind(globalThis);
    globalThis.fetch = instrumentedFetch as typeof fetch;
  }
  wrapCount += 1;
}

function uninstallFetchWrap() {
  wrapCount = Math.max(0, wrapCount - 1);
  if (wrapCount === 0 && savedFetch) {
    globalThis.fetch = savedFetch;
    savedFetch = null;
  }
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
