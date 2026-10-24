"use client";

import type { UseFormRegister, FieldErrors as RHFFieldErrors } from "react-hook-form";
import { FieldLabel } from "@/components/auth/field-label";
import { PasswordInput } from "@/components/auth/password-input";
import { AUTH_FIELD_HINTS } from "@/lib/constants/auth-field-hints";
import { AUTH_LIMITS } from "@/lib/constants/auth-limits";
import type { ChangeOwnPasswordInput } from "@/lib/validators/auth/change-own-password";
import type { FieldErrors } from "@/types/auth";

type ChangeOwnPasswordFieldsProps = {
  idPrefix: string;
  disabled: boolean;
  register: UseFormRegister<ChangeOwnPasswordInput>;
  errors: RHFFieldErrors<ChangeOwnPasswordInput>;
  fieldErrors?: FieldErrors;
  /** Label for the current-password field. */
  currentPasswordLabel?: string;
  currentPasswordPlaceholder?: string;
  newPasswordPlaceholder?: string;
  confirmPasswordLabel?: string;
  confirmPasswordPlaceholder?: string;
  /** Optional note under confirm (e.g. student forgot-password hint). */
  footerNote?: React.ReactNode;
};

/**
 * Shared current / new / confirm password fields for self-service password change.
 */
export function ChangeOwnPasswordFields({
  idPrefix,
  disabled,
  register,
  errors,
  fieldErrors,
  currentPasswordLabel = "Current password",
  currentPasswordPlaceholder = "Enter your current password",
  newPasswordPlaceholder = "Choose a new password",
  confirmPasswordLabel = "Confirm new password",
  confirmPasswordPlaceholder = "Confirm your new password",
  footerNote,
}: ChangeOwnPasswordFieldsProps) {
  const currentPasswordError =
    errors.currentPassword?.message ?? fieldErrors?.currentPassword?.[0];
  const newPasswordError =
    errors.newPassword?.message ?? fieldErrors?.newPassword?.[0];
  const confirmPasswordError =
    errors.confirmPassword?.message ?? fieldErrors?.confirmPassword?.[0];

  return (
    <>
      <div className="flex flex-col gap-2">
        <FieldLabel
          htmlFor={`${idPrefix}-current-password`}
          label={currentPasswordLabel}
        />
        <PasswordInput
          id={`${idPrefix}-current-password`}
          autoComplete="current-password"
          placeholder={currentPasswordPlaceholder}
          maxLength={AUTH_LIMITS.password.max}
          aria-invalid={!!currentPasswordError}
          disabled={disabled}
          {...register("currentPassword")}
        />
        {currentPasswordError ? (
          <p className="text-sm text-destructive">{currentPasswordError}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <FieldLabel
          htmlFor={`${idPrefix}-new-password`}
          label="New password"
          hint={AUTH_FIELD_HINTS.password}
        />
        <PasswordInput
          id={`${idPrefix}-new-password`}
          autoComplete="new-password"
          placeholder={newPasswordPlaceholder}
          minLength={AUTH_LIMITS.password.min}
          maxLength={AUTH_LIMITS.password.max}
          aria-invalid={!!newPasswordError}
          disabled={disabled}
          {...register("newPassword")}
        />
        {newPasswordError ? (
          <p className="text-sm text-destructive">{newPasswordError}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <FieldLabel
          htmlFor={`${idPrefix}-confirm-password`}
          label={confirmPasswordLabel}
          hint={AUTH_FIELD_HINTS.confirmPassword}
        />
        <PasswordInput
          id={`${idPrefix}-confirm-password`}
          autoComplete="new-password"
          placeholder={confirmPasswordPlaceholder}
          minLength={AUTH_LIMITS.password.min}
          maxLength={AUTH_LIMITS.password.max}
          aria-invalid={!!confirmPasswordError}
          disabled={disabled}
          {...register("confirmPassword")}
        />
        {confirmPasswordError ? (
          <p className="text-sm text-destructive">{confirmPasswordError}</p>
        ) : null}
        {footerNote}
      </div>
    </>
  );
}
