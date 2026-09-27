"use client";

import { useActionStateSettled } from "@/hooks/use-action-state-settled";

type SuccessState = {
  success?: boolean;
};

/**
 * Runs `onSuccess` once per completed action.
 * Settles from the new action state, not from transition pending going false.
 */
export function useActionStateSuccess<T extends SuccessState>(
  state: T,
  isPending: boolean,
  onSuccess: (state: T) => void,
  isReady: (state: T) => boolean = (next) => next.success === true
) {
  useActionStateSettled(state, isPending, isReady, onSuccess);
}
