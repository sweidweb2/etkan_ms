"use client";

import { useActionStateSettled } from "@/hooks/use-action-state-settled";
import {
  showActionResultToast,
  showErrorToast,
  type ActionToastState,
} from "@/lib/toast";

function hasFieldErrors(state: ActionToastState) {
  if (!state.fieldErrors) {
    return false;
  }
  return Object.values(state.fieldErrors).some(
    (messages) => Array.isArray(messages) && messages.length > 0
  );
}

function hasToastPayload(state: ActionToastState) {
  if (state.success === true || Boolean(state.message) || Boolean(state.warning)) {
    return true;
  }
  if (state.success === false || Boolean(state.error)) {
    return !hasFieldErrors(state);
  }
  return false;
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

    if (next.error && !hasFieldErrors(next)) {
      showErrorToast(next.error);
    }
  });
}
