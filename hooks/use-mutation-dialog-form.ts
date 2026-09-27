"use client";

import type { TransitionStartFunction } from "react";
import { useTransition } from "react";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { useFormActionState } from "@/hooks/use-form-action-state";
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
 * form action + pending-aware dismiss + toast + success close.
 */
export function useMutationDialogForm<TState extends MutationDialogState>({
  action,
  initialState,
  onOpenChange,
  onSuccess,
  isReady,
}: UseMutationDialogFormOptions<TState>): UseMutationDialogFormResult<TState> {
  const [, startTransition] = useTransition();
  const [state, formAction, isPending] = useFormActionState(
    action,
    initialState
  );
  const handleOpenChange = usePendingAwareOpenChange(isPending, onOpenChange);

  useActionStateToast(state, isPending);
  useActionStateSuccess(state, isPending, onSuccess, isReady);

  return {
    state,
    formAction,
    isPending,
    handleOpenChange,
    startTransition,
  };
}
