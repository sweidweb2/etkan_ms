"use client";

import { useEffect } from "react";
import {
  isNavTimingEnabled,
  navTimingClientMergeRsc,
  type NavTimingBeaconProps,
} from "@/lib/debug/nav-timing";

/**
 * Ships RSC layout/session timing marks into the active client NAV trip.
 * Mount once near the panel shell (not in every page).
 */
export function NavTimingBeacon({ tripId, marks }: NavTimingBeaconProps) {
  useEffect(() => {
    if (!isNavTimingEnabled() || !tripId) return;
    navTimingClientMergeRsc(tripId, marks);
  }, [tripId, marks]);

  return null;
}
