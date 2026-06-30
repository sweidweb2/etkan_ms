import { toast } from "sonner";

export type ToastVariant = "success" | "error" | "info";

export type ActionToastState = {
  success?: boolean;
  error?: string;
  message?: string;
  /** Shown as toast description (e.g. week number adjusted). */
  note?: string;
};

export function showSuccessToast(message: string, description?: string) {
  toast.success(message, { description });
}

export function showErrorToast(message: string, description?: string) {
  toast.error(message, { description });
}

export function showInfoToast(message: string, description?: string) {
  toast.info(message, { description });
}

export function showToast(
  variant: ToastVariant,
  message: string,
  description?: string
) {
  switch (variant) {
    case "success":
      showSuccessToast(message, description);
      break;
    case "error":
      showErrorToast(message, description);
      break;
    case "info":
      showInfoToast(message, description);
      break;
  }
}

export function showActionResultToast(state: ActionToastState) {
  if (state.success) {
    showSuccessToast(
      state.message ?? "Operation completed successfully.",
      state.note
    );
    return;
  }

  if (state.error) {
    showErrorToast(state.error);
  }
}
