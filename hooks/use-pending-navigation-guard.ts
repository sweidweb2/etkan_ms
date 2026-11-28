"use client";

import { useEffect } from "react";
import {
  acquirePendingMutation,
  releasePendingMutation,
} from "@/lib/navigation/pending-mutation-guard";

/**
 * Warns on tab close / refresh / in-app link click while `isPending` is true.
 * Safe to call from multiple components — uses a shared refcount.
 */
export function usePendingNavigationGuard(isPending: boolean) {
  useEffect(() => {
    if (!isPending) {
      return;
    }
    acquirePendingMutation();
    return () => {
      releasePendingMutation();
    };
  }, [isPending]);
}
