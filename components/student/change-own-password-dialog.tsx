"use client";

import { useEffect } from "react";
import {
  changeOwnPasswordAction,
  type ChangeOwnPasswordActionState,
} from "@/app/(panels)/student/actions";
import { FieldLabel } from "@/components/auth/field-label";
import { PasswordInput } from "@/components/auth/password-input";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { useFormActionState } from "@/hooks/use-form-action-state";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { useZodForm } from "@/hooks/use-zod-form";
import { AUTH_FIELD_HINTS } from "@/lib/constants/auth-field-hints";
import { AUTH_LIMITS } from "@/lib/constants/auth-limits";
import {
  changeOwnPasswordSchema,
  type ChangeOwnPasswordInput,
} from "@/lib/validators/student/change-own-password";

const initialState: ChangeOwnPasswordActionState = {};

const emptyValues = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

type ChangeOwnPasswordDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ChangeOwnPasswordDialog({
  open,
  onOpenChange,
}: ChangeOwnPasswordDialogProps) {
  const [state, formAction, isPending] = useFormActionState(
    changeOwnPasswordAction,
    initialState
  );
  const handleOpenChange = usePendingAwareOpenChange(isPending, onOpenChange);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useZodForm({
    schema: changeOwnPasswordSchema,
    mode: "onBlur",
    defaultValues: emptyValues,
  });

  useEffect(() => {
    if (open) {
      reset(emptyValues);
    }
  }, [open, reset]);

  useActionStateToast(state, isPending);
  useActionStateSuccess(state, isPending, () => {
    onOpenChange(false);
  });

  function onSubmit(values: ChangeOwnPasswordInput) {
    const formData = new FormData();
    formData.set("currentPassword", values.currentPassword);
    formData.set("newPassword", values.newPassword);
    formData.set("confirmPassword", values.confirmPassword);
    formAction(formData);
  }

  const currentPasswordError =
    errors.currentPassword?.message ?? state.fieldErrors?.currentPassword?.[0];
  const newPasswordError =
    errors.newPassword?.message ?? state.fieldErrors?.newPassword?.[0];
  const confirmPasswordError =
    errors.confirmPassword?.message ?? state.fieldErrors?.confirmPassword?.[0];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription className="text-xs">
            Enter your old password, then choose a new one and confirm it.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          noValidate
          onSubmit={handleSubmit(onSubmit)}
        >
          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="own-old-password" label="Old password" />
            <PasswordInput
              id="own-old-password"
              placeholder="Enter your old password"
              autoComplete="current-password"
              maxLength={AUTH_LIMITS.password.max}
              aria-invalid={!!currentPasswordError}
              disabled={isPending}
              {...register("currentPassword")}
            />
            {currentPasswordError ? (
              <p className="text-sm text-destructive">{currentPasswordError}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="own-new-password"
              label="New password"
              hint={AUTH_FIELD_HINTS.password}
            />
            <PasswordInput
              id="own-new-password"
              placeholder="Enter your new password"
              autoComplete="new-password"
              minLength={AUTH_LIMITS.password.min}
              maxLength={AUTH_LIMITS.password.max}
              aria-invalid={!!newPasswordError}
              disabled={isPending}
              {...register("newPassword")}
            />
            {newPasswordError ? (
              <p className="text-sm text-destructive">{newPasswordError}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="own-confirm-password"
              label="Confirm password"
              hint={AUTH_FIELD_HINTS.confirmPassword}
            />
            <PasswordInput
              id="own-confirm-password"
              placeholder="Confirm your new password"
              autoComplete="new-password"
              minLength={AUTH_LIMITS.password.min}
              maxLength={AUTH_LIMITS.password.max}
              aria-invalid={!!confirmPasswordError}
              disabled={isPending}
              {...register("confirmPassword")}
            />
            {confirmPasswordError ? (
              <p className="text-sm text-destructive">{confirmPasswordError}</p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              If you forgot your password, contact{" "}
              <a
                href="mailto:info@etkan.org"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                info@etkan.org
              </a>
              .
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <InlineSpinner /> : null}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
