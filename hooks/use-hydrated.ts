"use client";

import { useEffect, useState } from "react";

/**
 * False on the server and the first client render; true after mount.
 * Prefer this over useSyncExternalStore(true/false), which React 19 treats
 * as a hydration mismatch when getSnapshot !== getServerSnapshot.
 */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount gate for client-only UI
    setHydrated(true);
  }, []);

  return hydrated;
}
