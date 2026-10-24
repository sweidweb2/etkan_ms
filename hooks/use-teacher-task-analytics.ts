"use client";

import { useEffect, useState } from "react";
import {
  TEACHER_LAYOUT_DEFAULTS,
  TEACHER_LAYOUT_STORAGE_KEYS,
  TEACHER_LAYOUT_STORAGE_VALUES,
} from "@/lib/constants/teacher-layout-preferences";

function readTaskAnalytics(): boolean {
  if (typeof window === "undefined") {
    return TEACHER_LAYOUT_DEFAULTS.taskAnalytics;
  }

  try {
    const stored = window.localStorage.getItem(
      TEACHER_LAYOUT_STORAGE_KEYS.TASK_ANALYTICS
    );
    if (stored === TEACHER_LAYOUT_STORAGE_VALUES.ON) {
      return true;
    }
    if (stored === TEACHER_LAYOUT_STORAGE_VALUES.OFF) {
      return false;
    }
  } catch {
    // Ignore quota / privacy-mode failures.
  }

  return TEACHER_LAYOUT_DEFAULTS.taskAnalytics;
}

function writeTaskAnalytics(enabled: boolean) {
  try {
    window.localStorage.setItem(
      TEACHER_LAYOUT_STORAGE_KEYS.TASK_ANALYTICS,
      enabled
        ? TEACHER_LAYOUT_STORAGE_VALUES.ON
        : TEACHER_LAYOUT_STORAGE_VALUES.OFF
    );
  } catch {
    // Ignore quota / privacy-mode failures.
  }
}

/**
 * Teacher layout preference: show task analytics cards on class Tasks tabs.
 * Hydrates from localStorage after mount to avoid SSR mismatches.
 */
export function useTeacherTaskAnalytics() {
  const [enabled, setEnabled] = useState(
    TEACHER_LAYOUT_DEFAULTS.taskAnalytics
  );
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    // Intentional: hydrate from localStorage after mount (server has no access).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration sync from localStorage
    setEnabled(readTaskAnalytics());
    setHasHydrated(true);
  }, []);

  function setTaskAnalytics(next: boolean | ((current: boolean) => boolean)) {
    setEnabled((current) => {
      const resolved = typeof next === "function" ? next(current) : next;
      writeTaskAnalytics(resolved);
      return resolved;
    });
  }

  return {
    enabled,
    setEnabled: setTaskAnalytics,
    hasHydrated,
  } as const;
}
