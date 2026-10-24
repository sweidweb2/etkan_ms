"use client";

import { useEffect } from "react";
import {
  changeOwnTeacherPasswordAction,
  type ChangeOwnTeacherPasswordActionState,
} from "@/app/teacher/settings/actions";
import { FieldLabel } from "@/components/auth/field-label";
import { PasswordInput } from "@/components/auth/password-input";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { useFormActionState } from "@/hooks/use-form-action-state";
import { useZodForm } from "@/hooks/use-zod-form";
import { AUTH_FIELD_HINTS } from "@/lib/constants/auth-field-hints";
import { AUTH_LIMITS } from "@/lib/constants/auth-limits";
import {
  changeOwnPasswordSchema,
  type ChangeOwnPasswordInput,
} from "@/lib/validators/student/change-own-password";

const initialState: ChangeOwnTeacherPasswordActionState = {};

const emptyValues: ChangeOwnPasswordInput = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export function TeacherSettingsPasswordForm() {
  const [state, formAction, isPending] = useFormActionState(
    changeOwnTeacherPasswordAction,
    initialState
  );

  useActionStateToast(state, isPending);

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
    if (state.success) {
      reset(emptyValues);
    }
  }, [state.success, reset]);

  const currentPasswordError =
    errors.currentPassword?.message ??
    state.fieldErrors?.currentPassword?.[0];
  const newPasswordError =
    errors.newPassword?.message ?? state.fieldErrors?.newPassword?.[0];
  const confirmPasswordError =
    errors.confirmPassword?.message ??
    state.fieldErrors?.confirmPassword?.[0];

  function onSubmit(values: ChangeOwnPasswordInput) {
    const formData = new FormData();
    formData.set("currentPassword", values.currentPassword);
    formData.set("newPassword", values.newPassword);
    formData.set("confirmPassword", values.confirmPassword);
    formAction(formData);
  }

  return (
    <Card className="h-full border-border/70 bg-card shadow-[0_10px_28px_-24px_rgba(62,62,117,0.22)]">
      <CardHeader className="border-b border-border/50 bg-muted/25 pb-3">
        <CardTitle className="text-base">Password</CardTitle>
        <CardDescription>
          Confirm your current password, then choose a new one.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="teacher-current-password"
              label="Current password"
            />
            <PasswordInput
              id="teacher-current-password"
              autoComplete="current-password"
              placeholder="Enter your current password"
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
              htmlFor="teacher-new-password"
              label="New password"
              hint={AUTH_FIELD_HINTS.password}
            />
            <PasswordInput
              id="teacher-new-password"
              autoComplete="new-password"
              placeholder="Choose a new password"
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
              htmlFor="teacher-confirm-password"
              label="Confirm new password"
              hint={AUTH_FIELD_HINTS.confirmPassword}
            />
            <PasswordInput
              id="teacher-confirm-password"
              autoComplete="new-password"
              placeholder="Confirm your new password"
              minLength={AUTH_LIMITS.password.min}
              maxLength={AUTH_LIMITS.password.max}
              aria-invalid={!!confirmPasswordError}
              disabled={isPending}
              {...register("confirmPassword")}
            />
            {confirmPasswordError ? (
              <p className="text-sm text-destructive">{confirmPasswordError}</p>
            ) : null}
          </div>

          <div className="flex justify-end pt-1">
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? <InlineSpinner /> : null}
              Update password
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
