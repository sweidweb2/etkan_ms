"use client";

import { useCallback, useEffect, useRef } from "react";
import { logoutDueToInactivityAction } from "@/app/(public)/auth/actions";
import {
  broadcastSessionActivity,
  broadcastSessionEnded,
  subscribeSessionCrossTab,
} from "@/lib/auth/session-cross-tab";
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
  const loggingOutRef = useRef(false);

  const clearIdleTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const scheduleIdleTimeout = useCallback(() => {
    clearIdleTimeout();
    timeoutRef.current = setTimeout(() => {
      if (loggingOutRef.current) {
        return;
      }
      loggingOutRef.current = true;
      broadcastSessionEnded("session_expired");
      void logoutDueToInactivityAction();
    }, SESSION_INACTIVITY_MS);
  }, [clearIdleTimeout]);

  const onActivity = useCallback(
    (options?: { remote?: boolean }) => {
      const now = Date.now();

      if (now - lastActivityRef.current < ACTIVITY_DEBOUNCE_MS) {
        return;
      }

      lastActivityRef.current = now;
      scheduleIdleTimeout();

      if (!options?.remote) {
        broadcastSessionActivity();
      }
    },
    [scheduleIdleTimeout]
  );

  useEffect(() => {
    const onLocalActivity = () => {
      onActivity();
    };

    scheduleIdleTimeout();

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onLocalActivity, { passive: true });
    }

    const unsubscribe = subscribeSessionCrossTab({
      onActivity: () => {
        onActivity({ remote: true });
      },
    });

    return () => {
      clearIdleTimeout();
      unsubscribe();

      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onLocalActivity);
      }
    };
  }, [clearIdleTimeout, onActivity, scheduleIdleTimeout]);

  return null;
}
