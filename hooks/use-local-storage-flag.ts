"use client";

import { useEffect, useState } from "react";

type UseLocalStorageFlagOptions = {
  /** Stored when enabled. Defaults to `"on"`. */
  onValue?: string;
  /** Stored when disabled. Defaults to `"off"`. */
  offValue?: string;
};

function readFlag(
  key: string,
  defaultValue: boolean,
  onValue: string,
  offValue: string
): boolean {
  if (typeof window === "undefined") {
    return defaultValue;
  }

  try {
    const stored = window.localStorage.getItem(key);
    if (stored === onValue) {
      return true;
    }
    if (stored === offValue) {
      return false;
    }
  } catch {
    // Ignore quota / privacy-mode failures.
  }

  return defaultValue;
}

function writeFlag(
  key: string,
  enabled: boolean,
  onValue: string,
  offValue: string
) {
  try {
    window.localStorage.setItem(key, enabled ? onValue : offValue);
  } catch {
    // Ignore quota / privacy-mode failures.
  }
}

/**
 * Boolean preference backed by localStorage.
 * Hydrates after mount to avoid SSR mismatches.
 */
export function useLocalStorageFlag(
  key: string,
  defaultValue: boolean,
  options: UseLocalStorageFlagOptions = {}
) {
  const onValue = options.onValue ?? "on";
  const offValue = options.offValue ?? "off";
  const [enabled, setEnabled] = useState(defaultValue);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    // Intentional: hydrate from localStorage after mount (server has no access).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration sync from localStorage
    setEnabled(readFlag(key, defaultValue, onValue, offValue));
    setHasHydrated(true);
  }, [key, defaultValue, onValue, offValue]);

  function setFlag(next: boolean | ((current: boolean) => boolean)) {
    setEnabled((current) => {
      const resolved = typeof next === "function" ? next(current) : next;
      writeFlag(key, resolved, onValue, offValue);
      return resolved;
    });
  }

  return {
    enabled,
    setEnabled: setFlag,
    hasHydrated,
  } as const;
}
