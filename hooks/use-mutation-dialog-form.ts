"use client";

import {
  useActionState,
  useTransition,
  type TransitionStartFunction,
} from "react";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import type { ActionToastState } from "@/lib/toast";

type MutationDialogState = ActionToastState & {
  success?: boolean;
};

type MutationDialogAction<TState extends MutationDialogState> = (
  prevState: TState,
  formData: FormData
) => Promise<TState> | TState;

type UseMutationDialogFormOptions<TState extends MutationDialogState> = {
  action: MutationDialogAction<TState>;
  initialState: TState;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (state: TState) => void;
  isReady?: (state: TState) => boolean;
};

type UseMutationDialogFormResult<TState extends MutationDialogState> = {
  state: TState;
  formAction: (formData: FormData) => void;
  isPending: boolean;
  handleOpenChange: (open: boolean) => void;
  startTransition: TransitionStartFunction;
};

/**
 * Composes the standard mutation Dialog/Sheet wiring:
 * useActionState + useTransition + pending-aware dismiss + toast + success close.
 */
export function useMutationDialogForm<TState extends MutationDialogState>({
  action,
  initialState,
  onOpenChange,
  onSuccess,
  isReady,
}: UseMutationDialogFormOptions<TState>): UseMutationDialogFormResult<TState> {
  const [, startTransition] = useTransition();
  // React's useActionState generics use Awaited<State>, which does not preserve
  // unconstrained type params — cast keeps FormData dispatch typing intact.
  const [state, dispatch, isActionPending] = useActionState(
    action as never,
    initialState as never
  ) as [TState, (payload: FormData) => void, boolean];
  // Button / dismiss follow the action only. A leftover useTransition can
  // stay pending until the next click after a successful save.
  const isPending = isActionPending;
  const handleOpenChange = usePendingAwareOpenChange(isPending, onOpenChange);

  useActionStateToast(state, isPending);
  useActionStateSuccess(state, isPending, onSuccess, isReady);

  function formAction(formData: FormData) {
    startTransition(() => {
      dispatch(formData);
    });
  }

  return {
    state,
    formAction,
    isPending,
    handleOpenChange,
    startTransition,
  };
}
