"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  loginUrlForSessionEnded,
  subscribeSessionCrossTab,
  type SessionEndedReason,
} from "@/lib/auth/session-cross-tab";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";

/**
 * When another tab ends the session (logout / idle), clear client caches,
 * cover the panel UI, and hard-navigate to login so in-memory RSC/UI state dies.
 */
export function SessionCrossTabGuard() {
  const queryClient = useQueryClient();
  const [locked, setLocked] = useState(false);
  const handledRef = useRef(false);

  useEffect(() => {
    const endSession = (reason: SessionEndedReason) => {
      if (handledRef.current) {
        return;
      }
      handledRef.current = true;
      setLocked(true);
      queryClient.clear();
      window.location.replace(loginUrlForSessionEnded(reason));
    };

    const unsubscribe = subscribeSessionCrossTab({
      onSessionEnded: endSession,
    });

    const checkSessionOnVisible = () => {
      if (document.visibilityState !== "visible" || handledRef.current) {
        return;
      }

      void getBrowserSupabaseClient()
        .auth.getSession()
        .then(({ data }) => {
          if (!data.session) {
            endSession("signed_out");
          }
        })
        .catch(() => {
          // Ignore transient client errors; middleware still gates next nav.
        });
    };

    document.addEventListener("visibilitychange", checkSessionOnVisible);

    return () => {
      unsubscribe();
      document.removeEventListener("visibilitychange", checkSessionOnVisible);
    };
  }, [queryClient]);

  if (!locked) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-busy="true"
      className="fixed inset-0 z-[100] bg-background"
    />
  );
}
