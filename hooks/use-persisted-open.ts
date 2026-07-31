"use client";

import { useCallback, useId, useSyncExternalStore } from "react";

const OPEN_VALUE = "open";
const CLOSED_VALUE = "closed";

/** Same-tab listeners (storage events only fire across tabs). */
const listenersByKey = new Map<string, Set<() => void>>();

/** In-memory open state when no localStorage key is provided. */
const ephemeralOpenByKey = new Map<string, boolean>();

function notifyKey(key: string) {
  const listeners = listenersByKey.get(key);
  if (!listeners) {
    return;
  }
  for (const listener of listeners) {
    listener();
  }
}

function readStoredOpen(storageKey: string, defaultOpen: boolean): boolean {
  if (typeof window === "undefined") {
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

function writeStoredOpen(storageKey: string, open: boolean) {
  try {
    window.localStorage.setItem(
      storageKey,
      open ? OPEN_VALUE : CLOSED_VALUE
    );
  } catch {
    // Ignore quota / privacy-mode failures.
  }
}

function readOpen(
  key: string,
  persisted: boolean,
  defaultOpen: boolean
): boolean {
  if (persisted) {
    return readStoredOpen(key, defaultOpen);
  }

  if (ephemeralOpenByKey.has(key)) {
    return ephemeralOpenByKey.get(key)!;
  }

  return defaultOpen;
}

function writeOpen(key: string, persisted: boolean, open: boolean) {
  if (persisted) {
    writeStoredOpen(key, open);
  } else {
    ephemeralOpenByKey.set(key, open);
  }
  notifyKey(key);
}

/**
 * Collapse open state with optional localStorage persistence.
 * Uses useSyncExternalStore so the client snapshot can differ from the
 * server default without a cascading setState-in-effect.
 */
export function usePersistedOpen(
  storageKey: string | undefined,
  defaultOpen: boolean
) {
  const reactId = useId();
  const persisted = Boolean(storageKey);
  const key = storageKey ?? `ephemeral:${reactId}`;

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (typeof window === "undefined") {
        return () => {};
      }

      let listeners = listenersByKey.get(key);
      if (!listeners) {
        listeners = new Set();
        listenersByKey.set(key, listeners);
      }
      listeners.add(onStoreChange);

      const onStorage = (event: StorageEvent) => {
        if (persisted && event.key === key) {
          onStoreChange();
        }
      };
      window.addEventListener("storage", onStorage);

      return () => {
        listeners!.delete(onStoreChange);
        window.removeEventListener("storage", onStorage);
      };
    },
    [key, persisted]
  );

  const getSnapshot = useCallback(
    () => readOpen(key, persisted, defaultOpen),
    [key, persisted, defaultOpen]
  );

  const getServerSnapshot = useCallback(() => defaultOpen, [defaultOpen]);

  const open = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  function setPersistedOpen(next: boolean | ((current: boolean) => boolean)) {
    const resolved = typeof next === "function" ? next(open) : next;
    writeOpen(key, persisted, resolved);
  }

  return [open, setPersistedOpen] as const;
}
