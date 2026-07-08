"use client";

import { useActionState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { signupAction } from "@/app/auth/signup/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldLabel } from "@/components/auth/field-label";
import { PasswordInput } from "@/components/auth/password-input";
import { AUTH_FIELD_HINTS } from "@/lib/constants/auth-field-hints";
import { AUTH_LIMITS } from "@/lib/constants/auth-limits";
import { ROUTES } from "@/lib/constants/routes";
import { getLocalIsoDate } from "@/lib/utils/local-iso-date";
import { signupSchema, type SignupInput } from "@/lib/validators/auth/auth";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import type { SignupActionState } from "@/types/auth";

const initialState: SignupActionState = {};

export function SignupForm() {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    signupAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;

  useActionStateToast(state, isPending);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    mode: "onBlur",
    defaultValues: {
      birthDate: "",
      phone: "",
    },
  });

  function onSubmit(values: SignupInput) {
    const formData = new FormData();
    formData.set("username", values.username);
    formData.set("fullName", values.fullName);
    formData.set("email", values.email);
    formData.set("password", values.password);
    formData.set("confirmPassword", values.confirmPassword);
    formData.set("birthDate", values.birthDate ?? "");
    formData.set("phone", values.phone ?? "");
    startTransition(() => {
      formAction(formData);
    });
  }

  const usernameError =
    errors.username?.message ?? state.fieldErrors?.username?.[0];
  const fullNameError =
    errors.fullName?.message ?? state.fieldErrors?.fullName?.[0];
  const emailError = errors.email?.message ?? state.fieldErrors?.email?.[0];
  const passwordError =
    errors.password?.message ?? state.fieldErrors?.password?.[0];
  const confirmPasswordError =
    errors.confirmPassword?.message ??
    state.fieldErrors?.confirmPassword?.[0];
  const phoneError = errors.phone?.message ?? state.fieldErrors?.phone?.[0];
  const birthDateError =
    errors.birthDate?.message ?? state.fieldErrors?.birthDate?.[0];

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      noValidate
    >
      <div className="flex flex-col gap-2">
        <FieldLabel
          htmlFor="username"
          label="Username"
          hint={AUTH_FIELD_HINTS.username}
        />
        <Input
          id="username"
          type="text"
          autoComplete="username"
          placeholder="student_username"
          minLength={AUTH_LIMITS.username.min}
          maxLength={AUTH_LIMITS.username.max}
          aria-invalid={!!usernameError}
          {...register("username")}
        />
        {usernameError ? (
          <p className="text-sm text-destructive">{usernameError}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <FieldLabel
          htmlFor="fullName"
          label="Full name"
          hint={AUTH_FIELD_HINTS.fullName}
        />
        <Input
          id="fullName"
          type="text"
          autoComplete="name"
          placeholder="Your full name"
          minLength={AUTH_LIMITS.fullName.min}
          maxLength={AUTH_LIMITS.fullName.max}
          aria-invalid={!!fullNameError}
          {...register("fullName")}
        />
        {fullNameError ? (
          <p className="text-sm text-destructive">{fullNameError}</p>
        ) : null}
      </div>

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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <FieldLabel
            htmlFor="birthDate"
            label="Birth date"
            hint={AUTH_FIELD_HINTS.birthDate}
          />
          <Input
            id="birthDate"
            type="date"
            max={getLocalIsoDate()}
            aria-invalid={!!birthDateError}
            {...register("birthDate")}
          />
          {birthDateError ? (
            <p className="text-sm text-destructive">{birthDateError}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <FieldLabel
            htmlFor="phone"
            label="Phone"
            hint={AUTH_FIELD_HINTS.phone}
          />
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+961 ..."
            maxLength={AUTH_LIMITS.phone.max}
            aria-invalid={!!phoneError}
            {...register("phone")}
          />
          {phoneError ? (
            <p className="text-sm text-destructive">{phoneError}</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <FieldLabel
          htmlFor="password"
          label="Password"
          hint={AUTH_FIELD_HINTS.password}
        />
        <PasswordInput
          id="password"
          autoComplete="new-password"
          minLength={AUTH_LIMITS.password.min}
          maxLength={AUTH_LIMITS.password.max}
          aria-invalid={!!passwordError}
          {...register("password")}
        />
        {passwordError ? (
          <p className="text-sm text-destructive">{passwordError}</p>
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
          autoComplete="new-password"
          minLength={AUTH_LIMITS.password.min}
          maxLength={AUTH_LIMITS.password.max}
          aria-invalid={!!confirmPasswordError}
          {...register("confirmPassword")}
        />
        {confirmPasswordError ? (
          <p className="text-sm text-destructive">{confirmPasswordError}</p>
        ) : null}
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Creating account…" : "Create account"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href={ROUTES.LOGIN}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
