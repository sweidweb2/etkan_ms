"use client";

import { useEffect } from "react";
import {
  navTimingClientLoadingHidden,
  navTimingClientLoadingShown,
} from "@/lib/debug/nav-timing";
import { globalTopLoaderSession } from "@/lib/loaders/global-top-loader-session";

/**
 * Keeps the global top bar pending while a route loading UI is mounted.
 * Mount only from shared loading fallbacks — not feature modals.
 */
export function TopLoaderPendingBridge() {
  useEffect(() => {
    navTimingClientLoadingShown();
    const token = globalTopLoaderSession.start();
    return () => {
      navTimingClientLoadingHidden();
      globalTopLoaderSession.end(token);
    };
  }, []);

  return null;
}
