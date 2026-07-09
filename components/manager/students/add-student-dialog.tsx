"use client";

import { useEffect } from "react";
import { useZodForm } from "@/hooks/use-zod-form";
import { FieldLabel } from "@/components/auth/field-label";
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
import { AUTH_FIELD_HINTS } from "@/lib/constants/auth-field-hints";
import { AUTH_LIMITS } from "@/lib/constants/auth-limits";
import { STUDENT_STATUSES } from "@/lib/constants/manager-student-status";
import { showSuccessToast } from "@/lib/toast";
import { getLocalIsoDate } from "@/lib/utils/local-iso-date";
import {
  createStudentSchema,
  type CreateStudentInput,
} from "@/lib/validators/manager/create-student";
import type { ManagerStudentRow } from "@/types/manager-student";

type AddStudentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateStudent: (student: ManagerStudentRow) => void;
  existingStudents: ManagerStudentRow[];
};

export function AddStudentDialog({
  open,
  onOpenChange,
  onCreateStudent,
  existingStudents,
}: AddStudentDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useZodForm({
    schema: createStudentSchema,
    mode: "onBlur",
    defaultValues: {
      username: "",
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      birthDate: "",
      phone: "",
    },
  });

  useEffect(() => {
    if (!open) {
      reset({
        username: "",
        fullName: "",
        email: "",
        password: "",
        confirmPassword: "",
        birthDate: "",
        phone: "",
      });
    }
  }, [open, reset]);

  function onSubmit(values: CreateStudentInput) {
    const normalizedUsername = values.username.trim().toLowerCase();
    const normalizedEmail = values.email.trim().toLowerCase();

    const usernameTaken = existingStudents.some(
      (student) => student.username?.toLowerCase() === normalizedUsername
    );
    if (usernameTaken) {
      setError("username", { message: "This username is already taken." });
      return;
    }

    const emailTaken = existingStudents.some(
      (student) => student.email.toLowerCase() === normalizedEmail
    );
    if (emailTaken) {
      setError("email", { message: "This email is already in use." });
      return;
    }

    const userId = crypto.randomUUID();
    const birthDate = values.birthDate?.trim() || null;
    const phone = values.phone?.trim() || null;

    onCreateStudent({
      user_id: userId,
      student_profile_id: crypto.randomUUID(),
      username: values.username.trim(),
      email: values.email.trim(),
      full_name: values.fullName.trim(),
      birth_date: birthDate,
      phone,
      status: STUDENT_STATUSES.ACTIVE,
      created_at: new Date().toISOString(),
    });

    showSuccessToast("Student added to the preview list.");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add student</DialogTitle>
          <DialogDescription>
            Create a student account and profile. Backend wiring comes later.
          </DialogDescription>
        </DialogHeader>

        <form
          id="add-student-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex max-h-[min(60vh,32rem)] flex-col gap-4 overflow-y-auto pr-1"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="add-student-username"
              label="Username"
              hint={AUTH_FIELD_HINTS.username}
            />
            <Input
              id="add-student-username"
              type="text"
              autoComplete="username"
              placeholder="student_username"
              minLength={AUTH_LIMITS.username.min}
              maxLength={AUTH_LIMITS.username.max}
              aria-invalid={!!errors.username}
              {...register("username")}
            />
            {errors.username ? (
              <p className="text-sm text-destructive">{errors.username.message}</p>
            ) : null}
          </div>

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
              aria-invalid={!!errors.fullName}
              {...register("fullName")}
            />
            {errors.fullName ? (
              <p className="text-sm text-destructive">{errors.fullName.message}</p>
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
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            {errors.email ? (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="add-student-password"
              label="Password"
              hint={AUTH_FIELD_HINTS.password}
            />
            <Input
              id="add-student-password"
              type="password"
              autoComplete="new-password"
              minLength={AUTH_LIMITS.password.min}
              maxLength={AUTH_LIMITS.password.max}
              aria-invalid={!!errors.password}
              {...register("password")}
            />
            {errors.password ? (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="add-student-confirm-password"
              label="Confirm password"
              hint={AUTH_FIELD_HINTS.confirmPassword}
            />
            <Input
              id="add-student-confirm-password"
              type="password"
              autoComplete="new-password"
              minLength={AUTH_LIMITS.password.min}
              maxLength={AUTH_LIMITS.password.max}
              aria-invalid={!!errors.confirmPassword}
              {...register("confirmPassword")}
            />
            {errors.confirmPassword ? (
              <p className="text-sm text-destructive">
                {errors.confirmPassword.message}
              </p>
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
              aria-invalid={!!errors.birthDate}
              {...register("birthDate")}
            />
            {errors.birthDate ? (
              <p className="text-sm text-destructive">{errors.birthDate.message}</p>
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
              aria-invalid={!!errors.phone}
              {...register("phone")}
            />
            {errors.phone ? (
              <p className="text-sm text-destructive">{errors.phone.message}</p>
            ) : null}
          </div>
        </form>

        <DialogFooter className="mt-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" form="add-student-form">
            Create student
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
