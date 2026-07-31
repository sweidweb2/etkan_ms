"use client";

import { useEffect, useState } from "react";

const OPEN_VALUE = "open";
const CLOSED_VALUE = "closed";

function readStoredOpen(
  storageKey: string | undefined,
  defaultOpen: boolean
): boolean {
  if (!storageKey || typeof window === "undefined") {
    return defaultOpen;
  }

  try {
    const stored = window.localStorage.getItem(storageKey);
    if (stored === OPEN_VALUE) {
      return true;
    }
    if (stored === CLOSED_VALUE) {
      return false;
    }
  } catch {
    // Ignore quota / privacy-mode failures.
  }

  return defaultOpen;
}

function writeStoredOpen(storageKey: string | undefined, open: boolean) {
  if (!storageKey) {
    return;
  }

  try {
    window.localStorage.setItem(
      storageKey,
      open ? OPEN_VALUE : CLOSED_VALUE
    );
  } catch {
    // Ignore quota / privacy-mode failures.
  }
}

/**
 * Collapse open state with optional localStorage persistence.
 * Starts from `defaultOpen` on the server, then syncs from storage after mount
 * to avoid hydration mismatches.
 */
export function usePersistedOpen(
  storageKey: string | undefined,
  defaultOpen: boolean
) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    setOpen(readStoredOpen(storageKey, defaultOpen));
  }, [storageKey, defaultOpen]);

  function setPersistedOpen(next: boolean | ((current: boolean) => boolean)) {
    setOpen((current) => {
      const resolved = typeof next === "function" ? next(current) : next;
      writeStoredOpen(storageKey, resolved);
      return resolved;
    });
  }

  return [open, setPersistedOpen] as const;
}
