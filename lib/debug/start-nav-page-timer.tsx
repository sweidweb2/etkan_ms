import { headers } from "next/headers";
import { NavTimingBeacon } from "@/components/debug/nav-timing-beacon";
import { getNavRscTimingBag } from "@/lib/auth/session";
import {
  NAV_TIMING_HEADER,
  isNavTimingEnabled,
  navTimingServerLog,
} from "@/lib/debug/nav-timing";

/**
 * Optional page-body timer. Call at the top of a `page.tsx`, then `.end()`
 * after data loads (before return) to attribute page work in the NAV trip.
 *
 * ```ts
 * const pageTimer = await startNavPageTimer("manager/dashboard");
 * const data = await load...
 * pageTimer.end();
 * return (
 *   <>
 *     {await navPageTimingBeacon()}
 *     <Panel ... />
 *   </>
 * );
 * ```
 */
export async function startNavPageTimer(pageLabel: string): Promise<{
  end: () => void;
}> {
  if (!isNavTimingEnabled()) {
    return { end: () => {} };
  }

  const tripId = (await headers()).get(NAV_TIMING_HEADER) ?? "rsc";
  const start = performance.now();

  return {
    end: () => {
      const ms = performance.now() - start;
      const bag = getNavRscTimingBag();
      bag.page = ms;
      navTimingServerLog(tripId, `page ${pageLabel}`, { page: ms });
    },
  };
}

/** Beam `page` (and any other bag marks) into the browser NAV summary. */
export async function navPageTimingBeacon() {
  if (!isNavTimingEnabled()) return null;
  const tripId = (await headers()).get(NAV_TIMING_HEADER);
  if (!tripId) return null;
  const bag = getNavRscTimingBag();
  return <NavTimingBeacon tripId={tripId} marks={{ ...bag }} />;
}
