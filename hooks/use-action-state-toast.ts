"use client";

import { useEffect, useRef } from "react";
import {
  showActionResultToast,
  showErrorToast,
  type ActionToastState,
} from "@/lib/toast";

function stateFingerprint(state: ActionToastState) {
  return JSON.stringify({
    success: state.success ?? null,
    error: state.error ?? null,
    message: state.message ?? null,
    note: state.note ?? null,
  });
}

function hasToastPayload(state: ActionToastState) {
  return (
    state.success === true ||
    state.success === false ||
    Boolean(state.error) ||
    Boolean(state.message)
  );
}

export function useActionStateToast(
  state: ActionToastState,
  isPending: boolean
) {
  const wasPendingRef = useRef(false);
  const lastFingerprintRef = useRef<string | null>(null);

  useEffect(() => {
    if (isPending) {
      wasPendingRef.current = true;
      lastFingerprintRef.current = null;
      return;
    }

    if (!wasPendingRef.current) {
      return;
    }

    wasPendingRef.current = false;

    if (!hasToastPayload(state)) {
      return;
    }

    const fingerprint = stateFingerprint(state);

    if (lastFingerprintRef.current === fingerprint) {
      return;
    }

    lastFingerprintRef.current = fingerprint;

    if (state.success === true) {
      showActionResultToast(state);
      return;
    }

    if (state.error) {
      showErrorToast(state.error);
    }
  }, [state, isPending]);
}
