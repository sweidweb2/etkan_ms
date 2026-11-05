"use client";

import { useEffect, useTransition } from "react";
import { useFormActionState as useActionState } from "@/hooks/use-form-action-state";
import { createStudentAction } from "@/app/manager/students/actions";
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
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { useZodForm } from "@/hooks/use-zod-form";
import { AUTH_FIELD_HINTS } from "@/lib/constants/auth-field-hints";
import { AUTH_LIMITS } from "@/lib/constants/auth-limits";
import { getLocalIsoDate } from "@/lib/utils/local-iso-date";
import {
  createStudentSchema,
  type CreateStudentFormInput,
} from "@/lib/validators/manager/create-student";
import type {
  CreateStudentActionState,
  ManagerStudentRow,
} from "@/types/manager-student";

const initialState: CreateStudentActionState = {};

type AddStudentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStudentCreated: (student: ManagerStudentRow) => void;
};

export function AddStudentDialog({
  open,
  onOpenChange,
  onStudentCreated,
}: AddStudentDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    createStudentAction,
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
    formState: { errors },
  } = useZodForm({
    schema: createStudentSchema,
    mode: "onBlur",
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      birthDate: "",
      phone: "",
    },
  });

  function applyGeneratedPassword(password: string) {
    setValue("password", password, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("confirmPassword", password, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  useEffect(() => {
    if (!open) {
      reset({
        fullName: "",
        email: "",
        password: "",
        confirmPassword: "",
        birthDate: "",
        phone: "",
      });
    }
  }, [open, reset]);

  useActionStateSuccess(state, isPending, (nextState) => {
    onOpenChange(false);
    if (nextState.student) {
      onStudentCreated(nextState.student);
    }
  });

  function onSubmit(values: CreateStudentFormInput) {
    const formData = new FormData();
    formData.set("fullName", values.fullName.trim());
    formData.set("email", values.email.trim());
    formData.set("password", values.password ?? "");
    formData.set("confirmPassword", values.confirmPassword ?? "");
    formData.set("birthDate", values.birthDate?.trim() ?? "");
    formData.set("phone", values.phone?.trim() ?? "");

    startTransition(() => {
      formAction(formData);
    });
  }

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
          <DialogTitle>Add student</DialogTitle>
          <DialogDescription>
            Create a student account and profile. Leave password blank to use
            the default.
          </DialogDescription>
        </DialogHeader>

        <form
          id="add-student-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex max-h-[min(60vh,32rem)] flex-col gap-4 overflow-y-auto px-2"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="add-student-full-name"
              label="Full name"
              hint={AUTH_FIELD_HINTS.fullName}
            />
            <Input
              id="add-student-full-name"
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
              htmlFor="add-student-email"
              label="Email"
              hint={AUTH_FIELD_HINTS.email}
            />
            <Input
              id="add-student-email"
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
              htmlFor="add-student-password"
              label="Password"
              hint={AUTH_FIELD_HINTS.passwordOptional}
            />
            <PasswordInput
              id="add-student-password"
              autoComplete="new-password"
              maxLength={AUTH_LIMITS.password.max}
              aria-invalid={!!passwordError}
              disabled={isPending}
              onGeneratePassword={applyGeneratedPassword}
              {...register("password")}
            />
            {passwordError ? (
              <p className="text-sm text-destructive">{passwordError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="add-student-confirm-password"
              label="Confirm password"
              hint={AUTH_FIELD_HINTS.confirmPasswordOptional}
            />
            <PasswordInput
              id="add-student-confirm-password"
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
              htmlFor="add-student-birth-date"
              label="Birth date"
              hint={AUTH_FIELD_HINTS.birthDate}
            />
            <Input
              id="add-student-birth-date"
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
              htmlFor="add-student-phone"
              label="Phone"
              hint={AUTH_FIELD_HINTS.phone}
            />
            <Input
              id="add-student-phone"
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
          <Button type="submit" form="add-student-form" disabled={isPending}>
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
