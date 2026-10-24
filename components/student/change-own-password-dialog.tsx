"use client";

import { useEffect } from "react";
import {
  changeOwnPasswordAction,
  type ChangeOwnPasswordActionState,
} from "@/app/(panels)/student/actions";
import { ChangeOwnPasswordFields } from "@/components/auth/change-own-password-fields";
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
import {
  changeOwnPasswordSchema,
  type ChangeOwnPasswordInput,
} from "@/lib/validators/auth/change-own-password";

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
          <ChangeOwnPasswordFields
            idPrefix="own"
            disabled={isPending}
            register={register}
            errors={errors}
            fieldErrors={state.fieldErrors}
            currentPasswordLabel="Old password"
            currentPasswordPlaceholder="Enter your old password"
            newPasswordPlaceholder="Enter your new password"
            confirmPasswordLabel="Confirm password"
            confirmPasswordPlaceholder="Confirm your new password"
            footerNote={
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
            }
          />
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
