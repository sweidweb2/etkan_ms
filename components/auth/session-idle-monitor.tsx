"use client";

import { useCallback, useEffect, useRef } from "react";
import { logoutDueToInactivityAction } from "@/app/(public)/auth/actions";
import { SESSION_INACTIVITY_MS } from "@/lib/constants/auth-limits";

const ACTIVITY_EVENTS = [
  "pointerdown",
  "keydown",
  "scroll",
  "touchstart",
] as const;

const ACTIVITY_DEBOUNCE_MS = 1_000;

export function SessionIdleMonitor() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef(0);

  const clearIdleTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const scheduleIdleTimeout = useCallback(() => {
    clearIdleTimeout();
    timeoutRef.current = setTimeout(() => {
      void logoutDueToInactivityAction();
    }, SESSION_INACTIVITY_MS);
  }, [clearIdleTimeout]);

  const onActivity = useCallback(() => {
    const now = Date.now();

    if (now - lastActivityRef.current < ACTIVITY_DEBOUNCE_MS) {
      return;
    }

    lastActivityRef.current = now;
    scheduleIdleTimeout();
  }, [scheduleIdleTimeout]);

  useEffect(() => {
    scheduleIdleTimeout();

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true });
    }

    return () => {
      clearIdleTimeout();

      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity);
      }
    };
  }, [clearIdleTimeout, onActivity, scheduleIdleTimeout]);

  return null;
}
