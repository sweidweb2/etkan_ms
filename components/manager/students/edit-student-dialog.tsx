"use client";

import { useActionState, useEffect, useTransition } from "react";
import { updateStudentAction } from "@/app/manager/students/actions";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { useZodForm } from "@/hooks/use-zod-form";
import { AUTH_FIELD_HINTS } from "@/lib/constants/auth-field-hints";
import { AUTH_LIMITS } from "@/lib/constants/auth-limits";
import { MANAGER_STUDENT_STATUS_LABELS } from "@/lib/constants/manager-student-display";
import {
  STUDENT_STATUS_VALUES,
  type StudentStatusValue,
} from "@/lib/constants/manager-student-status";
import { getLocalIsoDate } from "@/lib/utils/local-iso-date";
import {
  updateStudentSchema,
  type UpdateStudentInput,
} from "@/lib/validators/manager/update-student";
import type {
  ManagerStudentRow,
  UpdateStudentActionState,
} from "@/types/manager-student";

const initialState: UpdateStudentActionState = {};

type EditStudentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: ManagerStudentRow;
  onStudentUpdated: (student: ManagerStudentRow) => void;
};

export function EditStudentDialog({
  open,
  onOpenChange,
  student,
  onStudentUpdated,
}: EditStudentDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    updateStudentAction,
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
    schema: updateStudentSchema,
    mode: "onBlur",
    defaultValues: {
      username: student.username ?? "",
      fullName: student.full_name,
      email: student.email,
      birthDate: student.birth_date ?? "",
      phone: student.phone ?? "",
      status: student.status,
    },
  });

  const selectedStatus = watch("status");

  useEffect(() => {
    if (open) {
      reset({
        username: student.username ?? "",
        fullName: student.full_name,
        email: student.email,
        birthDate: student.birth_date ?? "",
        phone: student.phone ?? "",
        status: student.status,
      });
    }
  }, [open, reset, student]);

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

  function onSubmit(values: UpdateStudentInput) {
    const formData = new FormData();
    formData.set("studentProfileId", student.student_profile_id);
    formData.set("userId", student.user_id);
    formData.set("username", values.username.trim());
    formData.set("fullName", values.fullName.trim());
    formData.set("email", values.email.trim());
    formData.set("birthDate", values.birthDate?.trim() ?? "");
    formData.set("phone", values.phone?.trim() ?? "");
    formData.set("status", values.status);

    startTransition(() => {
      formAction(formData);
    });
  }

  const usernameError =
    errors.username?.message ?? state.fieldErrors?.username?.[0];
  const fullNameError =
    errors.fullName?.message ?? state.fieldErrors?.fullName?.[0];
  const emailError = errors.email?.message ?? state.fieldErrors?.email?.[0];
  const birthDateError =
    errors.birthDate?.message ?? state.fieldErrors?.birthDate?.[0];
  const phoneError = errors.phone?.message ?? state.fieldErrors?.phone?.[0];
  const statusError = errors.status?.message ?? state.fieldErrors?.status?.[0];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Edit student</DialogTitle>
          <DialogDescription>
            Update student profile and account details.
          </DialogDescription>
        </DialogHeader>

        <form
          id="edit-student-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex max-h-[min(60vh,32rem)] flex-col gap-4 overflow-y-auto px-2"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-student-username"
              label="Username"
              hint={AUTH_FIELD_HINTS.username}
            />
            <Input
              id="edit-student-username"
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
              htmlFor="edit-student-full-name"
              label="Full name"
              hint={AUTH_FIELD_HINTS.fullName}
            />
            <Input
              id="edit-student-full-name"
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
              htmlFor="edit-student-email"
              label="Email"
              hint={AUTH_FIELD_HINTS.email}
            />
            <Input
              id="edit-student-email"
              type="email"
              autoComplete="email"
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
              htmlFor="edit-student-birth-date"
              label="Birth date"
              hint={AUTH_FIELD_HINTS.birthDate}
            />
            <Input
              id="edit-student-birth-date"
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
              htmlFor="edit-student-phone"
              label="Phone"
              hint={AUTH_FIELD_HINTS.phone}
            />
            <Input
              id="edit-student-phone"
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

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-student-status"
              label="Status"
              hint="Enrollment status"
            />
            <Select
              value={selectedStatus}
              disabled={isPending}
              onValueChange={(value) => {
                if (!value) {
                  return;
                }

                setValue("status", value as StudentStatusValue, {
                  shouldValidate: true,
                });
              }}
            >
              <SelectTrigger
                id="edit-student-status"
                className="w-full"
                aria-invalid={!!statusError}
              >
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {STUDENT_STATUS_VALUES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {MANAGER_STUDENT_STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {statusError ? (
              <p className="text-sm text-destructive">{statusError}</p>
            ) : null}
          </div>
        </form>

        <DialogFooter className="mt-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={isPending} onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" form="edit-student-form" disabled={isPending}>
            {isPending ? (
              <>
                <InlineSpinner className="mr-2" />
                Saving…
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
