"use client";

import { useActionState, useEffect, useTransition } from "react";
import { createStudentFromGuestAction } from "@/app/manager/guests/actions";
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
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { useZodForm } from "@/hooks/use-zod-form";
import { AUTH_FIELD_HINTS } from "@/lib/constants/auth-field-hints";
import { AUTH_LIMITS } from "@/lib/constants/auth-limits";
import { getLocalIsoDate } from "@/lib/utils/local-iso-date";
import {
  createStudentFromGuestSchema,
  type CreateStudentFromGuestFormInput,
} from "@/lib/validators/manager/create-student-from-guest";
import type {
  CreateStudentFromGuestActionState,
  ManagerGuestRegistrationApplicationSummary,
} from "@/types/manager-guest";

const initialState: CreateStudentFromGuestActionState = {};

type CreateStudentFromGuestDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guestId: string;
  application: ManagerGuestRegistrationApplicationSummary;
  onStudentCreated: (
    application: ManagerGuestRegistrationApplicationSummary
  ) => void;
};

function defaultsFromApplication(
  guestId: string,
  application: ManagerGuestRegistrationApplicationSummary
): CreateStudentFromGuestFormInput {
  return {
    guest_id: guestId,
    username: "",
    fullName: application.full_name,
    email: application.email,
    password: "",
    confirmPassword: "",
    birthDate: application.date_of_birth,
    phone: application.phone,
    markGuestAsFinished: true,
  };
}

export function CreateStudentFromGuestDialog({
  open,
  onOpenChange,
  guestId,
  application,
  onStudentCreated,
}: CreateStudentFromGuestDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    createStudentFromGuestAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;
  const handleOpenChange = usePendingAwareOpenChange(isPending, onOpenChange);

  useActionStateToast(state, isPending);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useZodForm({
    schema: createStudentFromGuestSchema,
    mode: "onBlur",
    defaultValues: defaultsFromApplication(guestId, application),
  });

  const markGuestAsFinished = watch("markGuestAsFinished");

  useEffect(() => {
    if (open) {
      reset(defaultsFromApplication(guestId, application));
    }
  }, [open, guestId, application, reset]);

  useActionStateSuccess(state, isPending, (nextState) => {
    onOpenChange(false);
    if (nextState.application) {
      onStudentCreated(nextState.application);
    }
  });

  function onSubmit(values: CreateStudentFromGuestFormInput) {
    const formData = new FormData();
    formData.set("guest_id", guestId);
    formData.set("username", values.username.trim());
    formData.set("fullName", values.fullName.trim());
    formData.set("email", values.email.trim());
    formData.set("password", values.password ?? "");
    formData.set("confirmPassword", values.confirmPassword ?? "");
    formData.set("birthDate", values.birthDate?.trim() ?? "");
    formData.set("phone", values.phone?.trim() ?? "");
    formData.set(
      "markGuestAsFinished",
      values.markGuestAsFinished ? "true" : "false"
    );

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
    errors.confirmPassword?.message ?? state.fieldErrors?.confirmPassword?.[0];
  const birthDateError =
    errors.birthDate?.message ?? state.fieldErrors?.birthDate?.[0];
  const phoneError = errors.phone?.message ?? state.fieldErrors?.phone?.[0];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Create student</DialogTitle>
          <DialogDescription>
            Map this registration into a student account. Leave password blank
            to use the default.
          </DialogDescription>
        </DialogHeader>

        <form
          id="create-student-from-guest-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex max-h-[min(60vh,32rem)] flex-col gap-4 overflow-y-auto px-2"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="create-student-from-guest-username"
              label="Username"
              hint={AUTH_FIELD_HINTS.username}
            />
            <Input
              id="create-student-from-guest-username"
              type="text"
              autoComplete="username"
              placeholder="student_username"
              minLength={AUTH_LIMITS.username.min}
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
              htmlFor="create-student-from-guest-full-name"
              label="Full name"
              hint={AUTH_FIELD_HINTS.fullName}
            />
            <Input
              id="create-student-from-guest-full-name"
              type="text"
              autoComplete="name"
              placeholder="Full name"
              minLength={AUTH_LIMITS.fullName.min}
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
              htmlFor="create-student-from-guest-email"
              label="Email"
              hint={AUTH_FIELD_HINTS.email}
            />
            <Input
              id="create-student-from-guest-email"
              type="email"
              autoComplete="email"
              placeholder="name@school.edu"
              minLength={AUTH_LIMITS.email.min}
              maxLength={AUTH_LIMITS.email.max}
              aria-invalid={!!emailError}
              disabled={isPending}
              {...register("email")}
            />
            {emailError ? (
              <p className="text-sm text-destructive">{emailError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="create-student-from-guest-password"
              label="Password"
              hint={AUTH_FIELD_HINTS.passwordOptional}
            />
            <PasswordInput
              id="create-student-from-guest-password"
              autoComplete="new-password"
              maxLength={AUTH_LIMITS.password.max}
              aria-invalid={!!passwordError}
              disabled={isPending}
              {...register("password")}
            />
            {passwordError ? (
              <p className="text-sm text-destructive">{passwordError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="create-student-from-guest-confirm-password"
              label="Confirm password"
              hint={AUTH_FIELD_HINTS.confirmPasswordOptional}
            />
            <PasswordInput
              id="create-student-from-guest-confirm-password"
              autoComplete="new-password"
              maxLength={AUTH_LIMITS.password.max}
              aria-invalid={!!confirmPasswordError}
              disabled={isPending}
              {...register("confirmPassword")}
            />
            {confirmPasswordError ? (
              <p className="text-sm text-destructive">{confirmPasswordError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="create-student-from-guest-birth-date"
              label="Birth date"
              hint={AUTH_FIELD_HINTS.birthDate}
            />
            <Input
              id="create-student-from-guest-birth-date"
              type="date"
              max={getLocalIsoDate()}
              aria-invalid={!!birthDateError}
              disabled={isPending}
              {...register("birthDate")}
            />
            {birthDateError ? (
              <p className="text-sm text-destructive">{birthDateError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="create-student-from-guest-phone"
              label="Phone"
              hint={AUTH_FIELD_HINTS.phone}
            />
            <Input
              id="create-student-from-guest-phone"
              type="tel"
              autoComplete="tel"
              placeholder="+961 70 000 000"
              maxLength={AUTH_LIMITS.phone.max}
              aria-invalid={!!phoneError}
              disabled={isPending}
              {...register("phone")}
            />
            {phoneError ? (
              <p className="text-sm text-destructive">{phoneError}</p>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
            <FieldLabel
              htmlFor="create-student-from-guest-mark-finished"
              label="Mark guest as finished"
              hint="Sets the guest profile status to finished"
            />
            <Switch
              id="create-student-from-guest-mark-finished"
              checked={Boolean(markGuestAsFinished)}
              disabled={isPending}
              onCheckedChange={(checked) =>
                setValue("markGuestAsFinished", checked, {
                  shouldValidate: true,
                })
              }
              aria-label="Mark guest as finished"
            />
          </div>
        </form>

        <DialogFooter className="mt-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-student-from-guest-form"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <InlineSpinner className="mr-2" />
                Creating…
              </>
            ) : (
              "Create student"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
