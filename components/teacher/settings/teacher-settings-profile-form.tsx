"use client";

import { useEffect } from "react";
import {
  updateOwnTeacherProfileAction,
  type UpdateOwnTeacherProfileActionState,
} from "@/app/teacher/settings/actions";
import { FieldLabel } from "@/components/auth/field-label";
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
import { useZodForm } from "@/hooks/use-zod-form";
import { AUTH_FIELD_HINTS } from "@/lib/constants/auth-field-hints";
import { AUTH_LIMITS } from "@/lib/constants/auth-limits";
import {
  updateOwnTeacherProfileSchema,
  type UpdateOwnTeacherProfileInput,
} from "@/lib/validators/teacher/update-own-profile";
import type { TeacherSelfProfile } from "@/services/auth/teacher-account-self.service";

const initialState: UpdateOwnTeacherProfileActionState = {};

type TeacherSettingsProfileFormProps = {
  profile: TeacherSelfProfile;
  onProfileUpdated?: (profile: TeacherSelfProfile) => void;
};

export function TeacherSettingsProfileForm({
  profile,
  onProfileUpdated,
}: TeacherSettingsProfileFormProps) {
  const [state, formAction, isPending] = useFormActionState(
    updateOwnTeacherProfileAction,
    initialState
  );

  useActionStateToast(state, isPending);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useZodForm({
    schema: updateOwnTeacherProfileSchema,
    mode: "onBlur",
    defaultValues: {
      fullName: profile.fullName,
      username: profile.username,
      email: profile.email,
    },
  });

  useEffect(() => {
    reset({
      fullName: profile.fullName,
      username: profile.username,
      email: profile.email,
    });
  }, [profile, reset]);

  useEffect(() => {
    if (state.success && state.profile) {
      onProfileUpdated?.(state.profile);
      reset({
        fullName: state.profile.fullName,
        username: state.profile.username,
        email: state.profile.email,
      });
    }
  }, [state, onProfileUpdated, reset]);

  const fullNameError =
    errors.fullName?.message ?? state.fieldErrors?.fullName?.[0];
  const usernameError =
    errors.username?.message ?? state.fieldErrors?.username?.[0];
  const emailError = errors.email?.message ?? state.fieldErrors?.email?.[0];

  function onSubmit(values: UpdateOwnTeacherProfileInput) {
    const formData = new FormData();
    formData.set("fullName", values.fullName);
    formData.set("username", values.username);
    formData.set("email", values.email);
    formAction(formData);
  }

  return (
    <Card className="h-full gap-0 border-border/70 bg-card py-0 shadow-[0_10px_28px_-24px_rgba(62,62,117,0.22)]">
      <CardHeader className="border-b border-border/50 bg-muted/25 px-5 py-4">
        <CardTitle className="text-base">Main info</CardTitle>
        <CardDescription>
          Update how your name and account details appear.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-5 py-5">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="teacher-full-name"
              label="Full name"
              hint={AUTH_FIELD_HINTS.fullName}
            />
            <Input
              id="teacher-full-name"
              autoComplete="name"
              placeholder="Your full name"
              maxLength={AUTH_LIMITS.fullName.max}
              aria-invalid={!!fullNameError}
              disabled={isPending}
              {...register("fullName")}
            />
            {fullNameError ? (
              <p className="text-sm text-destructive">{fullNameError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="teacher-username"
              label="Username"
              hint={AUTH_FIELD_HINTS.username}
            />
            <Input
              id="teacher-username"
              autoComplete="username"
              placeholder="Choose a username"
              maxLength={AUTH_LIMITS.username.max}
              aria-invalid={!!usernameError}
              disabled={isPending}
              {...register("username")}
            />
            {usernameError ? (
              <p className="text-sm text-destructive">{usernameError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="teacher-email"
              label="Email"
              hint={AUTH_FIELD_HINTS.email}
            />
            <Input
              id="teacher-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              maxLength={AUTH_LIMITS.email.max}
              aria-invalid={!!emailError}
              disabled={isPending}
              {...register("email")}
            />
            {emailError ? (
              <p className="text-sm text-destructive">{emailError}</p>
            ) : null}
          </div>

          <div className="flex justify-end pt-1">
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? <InlineSpinner /> : null}
              Save info
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
