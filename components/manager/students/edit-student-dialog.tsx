"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AUTH_FIELD_HINTS } from "@/lib/constants/auth-field-hints";
import { AUTH_LIMITS } from "@/lib/constants/auth-limits";
import { MANAGER_STUDENT_STATUS_LABELS } from "@/lib/constants/manager-student-display";
import { MANAGER_STUDENTS_MOCK } from "@/lib/constants/manager-students-mock";
import {
  STUDENT_STATUS_VALUES,
  type StudentStatusValue,
} from "@/lib/constants/manager-student-status";
import { showSuccessToast } from "@/lib/toast";
import { getLocalIsoDate } from "@/lib/utils/local-iso-date";
import {
  updateStudentSchema,
  type UpdateStudentInput,
} from "@/lib/validators/manager/update-student";
import type { ManagerStudentRow } from "@/types/manager-student";

type EditStudentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: ManagerStudentRow;
  onUpdateStudent: (student: ManagerStudentRow) => void;
};

export function EditStudentDialog({
  open,
  onOpenChange,
  student,
  onUpdateStudent,
}: EditStudentDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    setError,
    formState: { errors },
  } = useForm<UpdateStudentInput>({
    resolver: zodResolver(updateStudentSchema),
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

  function onSubmit(values: UpdateStudentInput) {
    const normalizedUsername = values.username.trim().toLowerCase();
    const normalizedEmail = values.email.trim().toLowerCase();

    const usernameTaken = MANAGER_STUDENTS_MOCK.some(
      (existingStudent) =>
        existingStudent.student_profile_id !== student.student_profile_id &&
        existingStudent.username?.toLowerCase() === normalizedUsername
    );
    if (usernameTaken) {
      setError("username", { message: "This username is already taken." });
      return;
    }

    const emailTaken = MANAGER_STUDENTS_MOCK.some(
      (existingStudent) =>
        existingStudent.student_profile_id !== student.student_profile_id &&
        existingStudent.email.toLowerCase() === normalizedEmail
    );
    if (emailTaken) {
      setError("email", { message: "This email is already in use." });
      return;
    }

    const birthDate = values.birthDate?.trim() || null;
    const phone = values.phone?.trim() || null;

    onUpdateStudent({
      ...student,
      username: values.username.trim(),
      full_name: values.fullName.trim(),
      email: values.email.trim(),
      birth_date: birthDate,
      phone,
      status: values.status,
    });

    showSuccessToast("Student details updated in the preview.");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit student</DialogTitle>
          <DialogDescription>
            Update student profile details. Changes are preview-only until backend
            is connected.
          </DialogDescription>
        </DialogHeader>

        <form
          id="edit-student-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex max-h-[min(60vh,32rem)] flex-col gap-4 overflow-y-auto pr-1"
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
              aria-invalid={!!errors.username}
              {...register("username")}
            />
            {errors.username ? (
              <p className="text-sm text-destructive">{errors.username.message}</p>
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
              aria-invalid={!!errors.fullName}
              {...register("fullName")}
            />
            {errors.fullName ? (
              <p className="text-sm text-destructive">{errors.fullName.message}</p>
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
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            {errors.email ? (
              <p className="text-sm text-destructive">{errors.email.message}</p>
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
              aria-invalid={!!errors.birthDate}
              {...register("birthDate")}
            />
            {errors.birthDate ? (
              <p className="text-sm text-destructive">{errors.birthDate.message}</p>
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
              aria-invalid={!!errors.phone}
              {...register("phone")}
            />
            {errors.phone ? (
              <p className="text-sm text-destructive">{errors.phone.message}</p>
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
                aria-invalid={!!errors.status}
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
            {errors.status ? (
              <p className="text-sm text-destructive">{errors.status.message}</p>
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
          <Button type="submit" form="edit-student-form">
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
