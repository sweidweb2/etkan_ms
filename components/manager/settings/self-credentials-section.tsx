"use client";

import type { FormEvent } from "react";
import {
  updateSelfCredentialsAction,
  type ChangeSelfCredentialsActionState,
} from "@/app/manager/settings/actions";
import { Can } from "@/components/auth/can";
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
import { Input } from "@/components/ui/input";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { useFormActionState } from "@/hooks/use-form-action-state";
import { AUTH_FIELD_HINTS } from "@/lib/constants/auth-field-hints";
import { AUTH_LIMITS } from "@/lib/constants/auth-limits";
import { PERMISSIONS } from "@/lib/constants/permissions";

const initialState: ChangeSelfCredentialsActionState = {};

export function SelfCredentialsSection() {
  const [state, formAction, isPending] = useFormActionState(
    updateSelfCredentialsAction,
    initialState
  );

  useActionStateToast(state, isPending);

  const newEmailError = state.fieldErrors?.newEmail?.[0];
  const newPasswordError = state.fieldErrors?.newPassword?.[0];
  const confirmPasswordError = state.fieldErrors?.confirmPassword?.[0];

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    formAction(new FormData(e.currentTarget));
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Account credentials</CardTitle>
        <CardDescription>
          Update your password and/or email. Leave a field blank if you do
          not want to change it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={onSubmit}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="newEmail"
              label="New email"
              hint={AUTH_FIELD_HINTS.email}
            />
            <Input
              id="newEmail"
              name="newEmail"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              maxLength={AUTH_LIMITS.email.max}
              aria-invalid={!!newEmailError}
              disabled={isPending}
            />
            {newEmailError ? (
              <p className="text-sm text-destructive">{newEmailError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="newPassword"
              label="New password"
              hint={AUTH_FIELD_HINTS.password}
            />
            <PasswordInput
              id="newPassword"
              name="newPassword"
              autoComplete="new-password"
              minLength={AUTH_LIMITS.password.min}
              maxLength={AUTH_LIMITS.password.max}
              aria-invalid={!!newPasswordError}
              disabled={isPending}
            />
            {newPasswordError ? (
              <p className="text-sm text-destructive">{newPasswordError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="confirmPassword"
              label="Confirm password"
              hint={AUTH_FIELD_HINTS.confirmPassword}
            />
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              autoComplete="new-password"
              minLength={AUTH_LIMITS.password.min}
              maxLength={AUTH_LIMITS.password.max}
              aria-invalid={!!confirmPasswordError}
              disabled={isPending}
            />
            {confirmPasswordError ? (
              <p className="text-sm text-destructive">
                {confirmPasswordError}
              </p>
            ) : null}
          </div>

          <div className="flex justify-end">
            <Can permission={PERMISSIONS.SETTINGS_UPDATE_CREDENTIALS}>
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending ? <InlineSpinner /> : "Save"}
              </Button>
            </Can>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

