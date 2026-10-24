"use client";

import { useLocalStorageBoolean } from "@/hooks/use-local-storage-boolean";

const OPEN_VALUE = "open";
const CLOSED_VALUE = "closed";

/**
 * Collapse open state with optional localStorage persistence.
 * Starts from `defaultOpen` on the server and the first client render, then
 * syncs from storage after mount to avoid hydration mismatches.
 */
export function usePersistedOpen(
  storageKey: string | undefined,
  defaultOpen: boolean
) {
  const { enabled, setEnabled } = useLocalStorageBoolean(
    storageKey ?? "",
    defaultOpen,
    { onValue: OPEN_VALUE, offValue: CLOSED_VALUE }
  );

  return [enabled, setEnabled] as const;
}
