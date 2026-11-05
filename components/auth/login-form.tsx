"use client";

import { useActionState, useSyncExternalStore, useTransition } from "react";
import { useZodForm } from "@/hooks/use-zod-form";
import { loginAction } from "@/app/(public)/auth/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldLabel } from "@/components/auth/field-label";
import { PasswordInput } from "@/components/auth/password-input";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { AUTH_LIMITS } from "@/lib/constants/auth-limits";
import { usePublicI18n } from "@/lib/i18n/public-i18n-provider";
import { loginSchema, type LoginInput } from "@/lib/validators/auth/auth";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import type { LoginActionState } from "@/types/auth";

const initialState: LoginActionState = {};
const emptySubscribe = () => () => {};

type LoginFormProps = {
  next?: string;
};

export function LoginForm({ next }: LoginFormProps) {
  const { t } = usePublicI18n();
  const hydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    loginAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;

  useActionStateToast(state, isPending);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useZodForm({
    schema: loginSchema,
    mode: "onBlur",
  });

  function onSubmit(values: LoginInput) {
    const formData = new FormData();
    formData.set("email", values.email);
    formData.set("password", values.password);
    if (next) {
      formData.set("next", next);
    }
    startTransition(() => {
      formAction(formData);
    });
  }

  const emailError = errors.email?.message ?? state.fieldErrors?.email?.[0];
  const passwordError =
    errors.password?.message ?? state.fieldErrors?.password?.[0];

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      noValidate
      data-testid="login-form"
      data-hydrated={hydrated ? "true" : "false"}
    >
      <div className="flex flex-col gap-2">
        <FieldLabel
          htmlFor="email"
          label={t("auth.field.email")}
          hint={t("auth.hint.email")}
        />
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder={t("auth.placeholder.email")}
          maxLength={AUTH_LIMITS.email.max}
          aria-invalid={!!emailError}
          {...register("email")}
        />
        {emailError ? (
          <p className="text-sm text-destructive">{emailError}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <FieldLabel
          htmlFor="password"
          label={t("auth.field.password")}
          hint={t("auth.hint.password")}
        />
        <PasswordInput
          id="password"
          autoComplete="current-password"
          placeholder={t("auth.placeholder.password")}
          minLength={AUTH_LIMITS.password.min}
          maxLength={AUTH_LIMITS.password.max}
          aria-invalid={!!passwordError}
          {...register("password")}
        />
        {passwordError ? (
          <p className="text-sm text-destructive">{passwordError}</p>
        ) : null}
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? (
          <>
            <InlineSpinner />
            {t("auth.login.submitting")}
          </>
        ) : (
          t("auth.login.submit")
        )}
      </Button>
    </form>
  );
}
