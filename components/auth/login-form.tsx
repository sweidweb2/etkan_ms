"use client";

import { useActionState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginAction } from "@/app/auth/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldLabel } from "@/components/auth/field-label";
import { PasswordInput } from "@/components/auth/password-input";
import { AUTH_FIELD_HINTS } from "@/lib/constants/auth-field-hints";
import { AUTH_LIMITS } from "@/lib/constants/auth-limits";
import { loginSchema, type LoginInput } from "@/lib/validators/auth/auth";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import type { LoginActionState } from "@/types/auth";

const initialState: LoginActionState = {};

type LoginFormProps = {
  next?: string;
};

export function LoginForm({ next }: LoginFormProps) {
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
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
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
    >
      <div className="flex flex-col gap-2">
        <FieldLabel htmlFor="email" label="Email" hint={AUTH_FIELD_HINTS.email} />
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
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
          label="Password"
          hint={AUTH_FIELD_HINTS.password}
        />
        <PasswordInput
          id="password"
          autoComplete="current-password"
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
        {isPending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
