"use client";

import { useEffect } from "react";
import { globalTopLoaderSession } from "@/lib/loaders/global-top-loader-session";

/**
 * Keeps the global top bar pending while a route loading UI is mounted.
 * Mount only from shared loading fallbacks — not feature modals.
 */
export function TopLoaderPendingBridge() {
  useEffect(() => {
    const token = globalTopLoaderSession.start();
    return () => {
      globalTopLoaderSession.end(token);
    };
  }, []);

  return null;
}
