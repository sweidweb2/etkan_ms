/**
 * Panel navigation timing tracer.
 *
 * Enable: default ON in `next dev`. Force with `NEXT_PUBLIC_NAV_DEBUG=1`.
 * Disable: `NEXT_PUBLIC_NAV_DEBUG=0`.
 *
 * Watch: browser DevTools console (grouped `[NAV …]` tables) + terminal
 * for middleware / RSC lines that share the same trip id.
 */

export const NAV_TIMING_HEADER = "x-etkan-nav-id";
export const NAV_MW_TIMING_HEADER = "x-etkan-mw-timing";
export const NAV_RSC_TIMING_HEADER = "x-etkan-rsc-timing";

type MarkMap = Record<string, number>;

type ClientTrip = {
  id: string;
  href: string;
  t0: number;
  marks: MarkMap;
  mw?: MarkMap;
  rsc?: MarkMap;
  fetchCount: number;
  settled: boolean;
  summarized: boolean;
  summarizeTimer: ReturnType<typeof setTimeout> | null;
};

declare global {
  var __etkanNavTrip: ClientTrip | null | undefined;
}

function envFlag(): string | undefined {
  return process.env.NEXT_PUBLIC_NAV_DEBUG;
}

export function isNavTimingEnabled(): boolean {
  const flag = envFlag();
  if (flag === "0" || flag === "false") return false;
  if (flag === "1" || flag === "true") return true;
  return process.env.NODE_ENV === "development";
}

export function createNavTripId(): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `n${Date.now().toString(36)}_${rand}`;
}

export function encodeTimingMarks(marks: MarkMap): string {
  return Object.entries(marks)
    .map(([key, ms]) => `${key}=${Math.round(ms)}`)
    .join(";");
}

export function decodeTimingMarks(raw: string | null | undefined): MarkMap {
  if (!raw) return {};
  const out: MarkMap = {};
  for (const part of raw.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq);
    const value = Number(trimmed.slice(eq + 1));
    if (Number.isFinite(value)) out[key] = value;
  }
  return out;
}

/** Safe clock for nav timing (avoids impure `performance.now` in RSC render). */
export function navNowMs() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function nowMs() {
  return navNowMs();
}

function serverLog(tripId: string, label: string, marks: MarkMap) {
  if (!isNavTimingEnabled()) return;
  const parts = Object.entries(marks)
    .map(([k, v]) => `${k}=${Math.round(v)}ms`)
    .join(" ");
  console.info(`[NAV ${tripId}] ${label} ${parts}`.trim());
}

/** Middleware / Node server checkpoint logger. */
export function navTimingServerLog(
  tripId: string | null | undefined,
  label: string,
  marks: MarkMap
) {
  serverLog(tripId ?? "unknown", label, marks);
}

/** Time an async block; returns result + elapsed ms. */
export async function navTimeAsync<T>(
  fn: () => Promise<T>
): Promise<{ result: T; ms: number }> {
  const start = nowMs();
  const result = await fn();
  return { result, ms: nowMs() - start };
}

function getActiveTrip(): ClientTrip | null {
  if (typeof window === "undefined") return null;
  return globalThis.__etkanNavTrip ?? null;
}

function setActiveTrip(trip: ClientTrip | null) {
  if (typeof window === "undefined") return;
  globalThis.__etkanNavTrip = trip;
}

function mark(trip: ClientTrip, name: string, at = nowMs()) {
  trip.marks[name] = Math.round(at - trip.t0);
}

function scheduleSummarize(trip: ClientTrip) {
  if (trip.summarizeTimer) clearTimeout(trip.summarizeTimer);
  trip.summarizeTimer = setTimeout(() => {
    summarizeTrip(trip);
  }, 120);
}

function summarizeTrip(trip: ClientTrip) {
  if (trip.summarized) return;
  if (!trip.settled) return;
  if (trip.fetchCount > 0) return;
  trip.summarized = true;

  const rows: { hop: string; ms: number; note?: string }[] = [
    { hop: "0 click", ms: trip.marks.click ?? 0 },
  ];

  if (trip.marks.fetch_start != null) {
    rows.push({
      hop: "1 RSC fetch start",
      ms: trip.marks.fetch_start,
      note: `+${trip.marks.fetch_start - (trip.marks.click ?? 0)}ms after click`,
    });
  }
  if (trip.marks.fetch_end != null) {
    rows.push({
      hop: "2 RSC fetch end (network+mw+rsc)",
      ms: trip.marks.fetch_end,
      note:
        trip.marks.fetch_start != null
          ? `fetch ${trip.marks.fetch_end - trip.marks.fetch_start}ms`
          : undefined,
    });
  }
  if (trip.marks.loading_shown != null) {
    rows.push({ hop: "3 loading UI shown", ms: trip.marks.loading_shown });
  }
  if (trip.marks.loading_hidden != null) {
    rows.push({ hop: "4 loading UI gone", ms: trip.marks.loading_hidden });
  }
  if (trip.marks.route_settled != null) {
    rows.push({ hop: "5 route settled", ms: trip.marks.route_settled });
  }

  const total =
    trip.marks.loading_hidden ??
    trip.marks.route_settled ??
    trip.marks.fetch_end ??
    0;

  console.groupCollapsed(
    `%c[NAV ${trip.id}] ${trip.href} → ${total}ms total`,
    "color:#3e3e75;font-weight:bold"
  );
  console.table(rows);

  if (trip.mw && Object.keys(trip.mw).length > 0) {
    console.log("%cMiddleware breakdown (from response header)", "font-weight:bold");
    console.table(
      Object.entries(trip.mw).map(([hop, ms]) => ({ hop: `mw:${hop}`, ms }))
    );
  }

  if (trip.rsc && Object.keys(trip.rsc).length > 0) {
    console.log("%cRSC / session breakdown (from layout beacon)", "font-weight:bold");
    console.table(
      Object.entries(trip.rsc).map(([hop, ms]) => ({ hop: `rsc:${hop}`, ms }))
    );
  }

  const suspects: string[] = [];
  const mwTotal = trip.mw?.total;
  const fetchDur =
    trip.marks.fetch_end != null && trip.marks.fetch_start != null
      ? trip.marks.fetch_end - trip.marks.fetch_start
      : null;
  if (mwTotal != null && mwTotal >= 400) {
    suspects.push(`middleware ${mwTotal}ms (auth/claims floor)`);
  }
  if (trip.mw?.maintenance != null && trip.mw.maintenance >= 300) {
    suspects.push(
      `maintenance check ${trip.mw.maintenance}ms (unexpected — middleware should skip this)`
    );
  }
  if (trip.rsc?.session_pack != null && trip.rsc.session_pack >= 200) {
    suspects.push(`session_pack ${trip.rsc.session_pack}ms`);
  }
  if (trip.rsc?.session_claims != null && trip.rsc.session_claims >= 150) {
    suspects.push(`session getClaims ${trip.rsc.session_claims}ms (duplicate of mw)`);
  }
  if (trip.rsc?.page != null && trip.rsc.page >= 300) {
    suspects.push(`page data ${trip.rsc.page}ms`);
  }
  if (
    fetchDur != null &&
    mwTotal != null &&
    fetchDur - mwTotal >= 300
  ) {
    suspects.push(
      `RSC after middleware ~${Math.round(fetchDur - mwTotal)}ms (layouts/page data)`
    );
  }
  if (suspects.length === 0 && total >= 800) {
    suspects.push("no single hop > thresholds — check Network waterfalls / cold compile");
  }
  if (suspects.length > 0) {
    console.warn("Likely bottleneck(s):", suspects.join(" | "));
  }
  console.groupEnd();

  if (getActiveTrip()?.id === trip.id) {
    setActiveTrip(null);
  }
}

/** Client: start a trip on sidebar/link click (or history arm). */
export function navTimingClientStart(href: string): string | null {
  if (!isNavTimingEnabled() || typeof window === "undefined") return null;

  const prev = getActiveTrip();
  if (prev?.summarizeTimer) clearTimeout(prev.summarizeTimer);

  const id = createNavTripId();
  const trip: ClientTrip = {
    id,
    href,
    t0: nowMs(),
    marks: {},
    fetchCount: 0,
    settled: false,
    summarized: false,
    summarizeTimer: null,
  };
  mark(trip, "click", trip.t0);
  setActiveTrip(trip);
  console.info(`[NAV ${id}] click → ${href}`);
  return id;
}

export function navTimingClientGetTripId(): string | null {
  return getActiveTrip()?.id ?? null;
}

export function navTimingClientFetchStart() {
  const trip = getActiveTrip();
  if (!trip || !isNavTimingEnabled()) return;
  trip.fetchCount += 1;
  if (trip.marks.fetch_start == null) {
    mark(trip, "fetch_start");
  }
}

export function navTimingClientFetchEnd(response: Response | null) {
  const trip = getActiveTrip();
  if (!trip || !isNavTimingEnabled()) return;

  trip.fetchCount = Math.max(0, trip.fetchCount - 1);
  if (trip.marks.fetch_end == null) {
    mark(trip, "fetch_end");
  }

  if (response) {
    const mwRaw = response.headers.get(NAV_MW_TIMING_HEADER);
    if (mwRaw) {
      trip.mw = { ...trip.mw, ...decodeTimingMarks(mwRaw) };
    }
  }

  scheduleSummarize(trip);
}

export function navTimingClientRouteSettled() {
  const trip = getActiveTrip();
  if (!trip || !isNavTimingEnabled()) return;
  mark(trip, "route_settled");
  trip.settled = true;
  scheduleSummarize(trip);
}

export function navTimingClientLoadingShown() {
  const trip = getActiveTrip();
  if (!trip || !isNavTimingEnabled()) return;
  if (trip.marks.loading_shown == null) {
    mark(trip, "loading_shown");
  }
}

export function navTimingClientLoadingHidden() {
  const trip = getActiveTrip();
  if (!trip || !isNavTimingEnabled()) return;
  mark(trip, "loading_hidden");
  scheduleSummarize(trip);
}

/** Merge RSC timing marks beamed from a layout client beacon. */
export function navTimingClientMergeRsc(tripId: string, marks: MarkMap) {
  if (!isNavTimingEnabled() || typeof window === "undefined") return;
  const trip = getActiveTrip();
  if (!trip || trip.id !== tripId) {
    // Late beacon after trip cleared — still log once.
    console.info(`[NAV ${tripId}] late RSC marks`, marks);
    return;
  }
  trip.rsc = { ...trip.rsc, ...marks };
  scheduleSummarize(trip);
}

export type NavTimingBeaconProps = {
  tripId: string | null;
  marks: MarkMap;
};
