"use client";

import { useEffect, useRef } from "react";

/**
 * Runs `onComplete` when action state updates after a submit starts.
 * Does not wait for `isPending` to go false — Next.js can keep a
 * transition pending until the next click while the action already
 * returned (spinner stuck, dialog stays open).
 */
export function useActionStateSettled<T>(
  state: T,
  isPending: boolean,
  isComplete: (state: T) => boolean,
  onComplete: (state: T) => void
) {
  const prevPendingRef = useRef(false);
  const stateAtSubmitRef = useRef<T | undefined>(undefined);
  const handledRef = useRef(true);
  const isCompleteRef = useRef(isComplete);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    isCompleteRef.current = isComplete;
  }, [isComplete]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (isPending && !prevPendingRef.current) {
      stateAtSubmitRef.current = state;
      handledRef.current = false;
    }
    prevPendingRef.current = isPending;

    if (handledRef.current) {
      return;
    }

    if (!isCompleteRef.current(state)) {
      if (!isPending) {
        handledRef.current = true;
      }
      return;
    }

    if (state === stateAtSubmitRef.current) {
      return;
    }

    handledRef.current = true;
    onCompleteRef.current(state);
  }, [state, isPending]);
}
