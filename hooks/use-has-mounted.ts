"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/** `false` during SSR and hydration, `true` after the client has mounted. */
export function useHasMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}
