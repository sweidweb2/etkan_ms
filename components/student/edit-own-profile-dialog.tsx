"use client";

import { useEffect } from "react";
import { updateOwnStudentProfileAction } from "@/app/(panels)/student/actions";
import { FieldLabel } from "@/components/auth/field-label";
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
import { useFormActionState } from "@/hooks/use-form-action-state";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { useZodForm } from "@/hooks/use-zod-form";
import { AUTH_FIELD_HINTS } from "@/lib/constants/auth-field-hints";
import { AUTH_LIMITS } from "@/lib/constants/auth-limits";
import { getLocalIsoDate } from "@/lib/utils/local-iso-date";
import {
  OWN_BIRTH_DATE_MIN,
  OWN_BIRTH_DATE_TOO_EARLY_MESSAGE,
  updateOwnStudentProfileSchema,
  type UpdateOwnStudentProfileInput,
} from "@/lib/validators/student/update-own-profile";
import type {
  ManagerStudentRow,
  UpdateStudentActionState,
} from "@/types/manager-student";

const initialState: UpdateStudentActionState = {};

type EditOwnProfileDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: ManagerStudentRow;
  onStudentUpdated: (student: ManagerStudentRow) => void;
};

export function EditOwnProfileDialog({
  open,
  onOpenChange,
  student,
  onStudentUpdated,
}: EditOwnProfileDialogProps) {
  const [state, formAction, isPending] = useFormActionState(
    updateOwnStudentProfileAction,
    initialState
  );
  const handleOpenChange = usePendingAwareOpenChange(isPending, onOpenChange);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useZodForm({
    schema: updateOwnStudentProfileSchema,
    mode: "onBlur",
    defaultValues: {
      username: student.username ?? "",
      fullName: student.full_name,
      birthDate: student.birth_date ?? "",
      phone: student.phone ?? "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        username: student.username ?? "",
        fullName: student.full_name,
        birthDate: student.birth_date ?? "",
        phone: student.phone ?? "",
      });
    }
  }, [open, reset, student]);

  useActionStateToast(state, isPending);
  useActionStateSuccess(
    state,
    isPending,
    (nextState) => {
      if (!nextState.student) {
        return;
      }
      onOpenChange(false);
      onStudentUpdated(nextState.student);
    },
    (nextState) => Boolean(nextState.success && nextState.student)
  );

  function onSubmit(values: UpdateOwnStudentProfileInput) {
    const formData = new FormData();
    formData.set("username", values.username.trim());
    formData.set("fullName", values.fullName.trim());
    formData.set("birthDate", values.birthDate?.trim() ?? "");
    formData.set("phone", values.phone?.trim() ?? "");
    formAction(formData);
  }

  const usernameError =
    errors.username?.message ?? state.fieldErrors?.username?.[0];
  const fullNameError =
    errors.fullName?.message ?? state.fieldErrors?.fullName?.[0];
  const birthDateError =
    errors.birthDate?.message ?? state.fieldErrors?.birthDate?.[0];
  const phoneError = errors.phone?.message ?? state.fieldErrors?.phone?.[0];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>
            Update your username, name, birth date, and phone.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          noValidate
          onSubmit={handleSubmit(onSubmit)}
        >
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="own-profile-username"
              label="Username"
              hint={AUTH_FIELD_HINTS.username}
            />
            <Input
              id="own-profile-username"
              type="text"
              autoComplete="username"
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
              htmlFor="own-profile-full-name"
              label="Full name"
              hint={AUTH_FIELD_HINTS.fullName}
            />
            <Input
              id="own-profile-full-name"
              type="text"
              autoComplete="name"
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
              htmlFor="own-profile-birth-date"
              label="Birth date"
              hint="Optional. 1900 or higher, and not in the future"
            />
            <Input
              id="own-profile-birth-date"
              type="date"
              min={OWN_BIRTH_DATE_MIN}
              max={getLocalIsoDate()}
              aria-invalid={!!birthDateError}
              disabled={isPending}
              {...register("birthDate", {
                onChange: (event) => {
                  const input = event.target as HTMLInputElement;
                  input.setCustomValidity(
                    input.value && input.value < OWN_BIRTH_DATE_MIN
                      ? OWN_BIRTH_DATE_TOO_EARLY_MESSAGE
                      : ""
                  );
                },
              })}
            />
            {birthDateError ? (
              <p className="text-sm text-destructive">{birthDateError}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="own-profile-phone"
              label="Phone"
              hint={AUTH_FIELD_HINTS.phone}
            />
            <Input
              id="own-profile-phone"
              type="tel"
              autoComplete="tel"
              maxLength={AUTH_LIMITS.phone.max}
              aria-invalid={!!phoneError}
              disabled={isPending}
              {...register("phone")}
            />
            {phoneError ? (
              <p className="text-sm text-destructive">{phoneError}</p>
            ) : null}
          </div>
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
