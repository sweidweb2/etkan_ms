"use client";

import { useEffect, useRef } from "react";

type SuccessState = {
  success?: boolean;
};

/**
 * Runs `onSuccess` once per completed action (pending → settled),
 * matching `useActionStateToast`. Avoids duplicate list updates when
 * parent re-renders recreate callback identities or Strict Mode remounts.
 */
export function useActionStateSuccess<T extends SuccessState>(
  state: T,
  isPending: boolean,
  onSuccess: (state: T) => void,
  isReady: (state: T) => boolean = (next) => next.success === true
) {
  const wasPendingRef = useRef(false);
  const lastFingerprintRef = useRef<string | null>(null);
  const onSuccessRef = useRef(onSuccess);
  const isReadyRef = useRef(isReady);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    isReadyRef.current = isReady;
  }, [isReady]);

  useEffect(() => {
    if (isPending) {
      wasPendingRef.current = true;
      return;
    }

    if (!wasPendingRef.current) {
      return;
    }

    wasPendingRef.current = false;

    if (!isReadyRef.current(state)) {
      return;
    }

    const fingerprint = JSON.stringify(state);

    if (lastFingerprintRef.current === fingerprint) {
      return;
    }

    lastFingerprintRef.current = fingerprint;
    onSuccessRef.current(state);
  }, [state, isPending]);
}
