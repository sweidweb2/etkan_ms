"use client";

import { useCallback, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  ensureActionTransitionFlushOnFetch,
  flushStuckActionTransition,
} from "@/lib/navigation/flush-stuck-action-transition";

type FormAction<TState, TPayload> = (
  prevState: TState,
  payload: TPayload
) => Promise<TState> | TState;

function toErrorState<TState>(prev: TState, error: unknown): TState {
  const message =
    error instanceof Error ? error.message : "Something went wrong.";

  return {
    ...(typeof prev === "object" && prev !== null ? prev : {}),
    success: false,
    error: message,
  } as TState;
}

/**
 * Drop-in for React `useActionState` on mutation forms.
 *
 * Calls the server action as a normal promise and updates pending/state
 * immediately. React's `useActionState` + `startTransition` keeps both
 * pending and the result inside the RSC refresh transition, which in
 * production (`next start`) often does not commit until the next click —
 * so the dialog stays open after a successful save.
 */
export function useFormActionState<TState, TPayload = FormData>(
  action: FormAction<TState, TPayload>,
  initialState: TState
): [TState, (payload: TPayload) => void, boolean] {
  const [state, setState] = useState(initialState);
  const [isPending, setIsPending] = useState(false);
  const stateRef = useRef(state);
  const actionRef = useRef(action);
  const requestIdRef = useRef(0);

  stateRef.current = state;
  actionRef.current = action;

  const formAction = useCallback((payload: TPayload) => {
    const requestId = ++requestIdRef.current;
    ensureActionTransitionFlushOnFetch();
    setIsPending(true);

    // Start the server action on the next tick so a wrapping
    // startTransition cannot own the RSC refresh (that refresh is
    // what stays pending until the next click in production).
    setTimeout(() => {
      if (requestId !== requestIdRef.current) {
        return;
      }

      void Promise.resolve(actionRef.current(stateRef.current, payload))
        .then((result) => {
          if (requestId !== requestIdRef.current) {
            return;
          }
          flushSync(() => {
            setState(result);
            setIsPending(false);
          });
          flushStuckActionTransition();
        })
        .catch((error: unknown) => {
          if (requestId !== requestIdRef.current) {
            return;
          }
          flushSync(() => {
            setState((prev) => toErrorState(prev, error));
            setIsPending(false);
          });
        })
        .finally(() => {
          if (requestId !== requestIdRef.current) {
            return;
          }
          setIsPending(false);
        });
    }, 0);
  }, []);

  return [state, formAction, isPending];
}
