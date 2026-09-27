"use client";

import { useActionStateSettled } from "@/hooks/use-action-state-settled";
import {
  showActionResultToast,
  showErrorToast,
  type ActionToastState,
} from "@/lib/toast";

function hasToastPayload(state: ActionToastState) {
  return (
    state.success === true ||
    state.success === false ||
    Boolean(state.error) ||
    Boolean(state.message) ||
    Boolean(state.warning)
  );
}

export function useActionStateToast(
  state: ActionToastState,
  isPending: boolean
) {
  useActionStateSettled(state, isPending, hasToastPayload, (next) => {
    if (next.success === true) {
      showActionResultToast(next);
      if (next.warning) {
        showErrorToast(next.warning);
      }
      return;
    }

    if (next.error) {
      showErrorToast(next.error);
    }
  });
}
