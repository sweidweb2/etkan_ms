"use client";

/**
 * Canonical boolean localStorage preference hook.
 * Re-exports `useLocalStorageFlag` under the clearer name used by callers.
 */
export {
  useLocalStorageFlag as useLocalStorageBoolean,
  useLocalStorageFlag,
} from "@/hooks/use-local-storage-flag";
