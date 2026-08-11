"use client";

import { useActionState, useEffect, useTransition } from "react";
import { createClassAction } from "@/app/manager/classes/actions";
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
import { CLASS_STATUSES } from "@/lib/constants/manager-class-status";
import { MANAGER_CLASS_STATUS_LABELS } from "@/lib/constants/manager-class-display";
import { MANAGER_USER_ROLE_LABELS } from "@/lib/constants/manager-user-display";
import {
  CLASS_STATUS_VALUES,
  createClassSchema,
  type CreateClassInput,
} from "@/lib/validators/manager/create-class";
import type {
  CreateClassActionState,
  ManagerClassSemesterOption,
  ManagerClassSubjectOption,
  ManagerClassTeacherSelectOption,
} from "@/types/manager-class-detail";
import type { ManagerClassRow } from "@/types/manager-class-list";

const SEMESTER_UNLINKED = "unlinked";
const TEACHER_UNASSIGNED = "none";
const initialState: CreateClassActionState = {};

type AddClassDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectOptions: ManagerClassSubjectOption[];
  semesterOptions: ManagerClassSemesterOption[];
  teacherOptions: ManagerClassTeacherSelectOption[];
  onClassCreated: (classRow: ManagerClassRow) => void;
};

export function AddClassDialog({
  open,
  onOpenChange,
  subjectOptions,
  semesterOptions,
  teacherOptions,
  onClassCreated,
}: AddClassDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    createClassAction,
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
    schema: createClassSchema,
    mode: "onBlur",
    defaultValues: {
      name: "",
      subject_id: "",
      status: CLASS_STATUSES.SCHEDULED,
      semester_id: "",
      teacher_id: "",
    },
  });

  const selectedSubjectId = watch("subject_id");
  const selectedStatus = watch("status");
  const selectedSemesterId = watch("semester_id");
  const selectedTeacherId = watch("teacher_id");

  const subjectSelectItems = subjectOptions.map((subject) => ({
    value: subject.id,
    label: subject.name,
  }));

  const statusSelectItems = CLASS_STATUS_VALUES.map((status) => ({
    value: status,
    label: MANAGER_CLASS_STATUS_LABELS[status],
  }));

  const semesterSelectItems = [
    { value: SEMESTER_UNLINKED, label: "No semester" },
    ...semesterOptions.map((semester) => ({
      value: semester.id,
      label: semester.name,
    })),
  ];

  const teacherSelectItems = [
    { value: TEACHER_UNASSIGNED, label: "No teacher" },
    ...teacherOptions.map((teacher) => {
      const name = teacher.username ?? "Unnamed user";
      const roleLabel = MANAGER_USER_ROLE_LABELS[teacher.role] ?? teacher.role;
      return {
        value: teacher.id,
        label: `${name} (${roleLabel})`,
      };
    }),
  ];

  useEffect(() => {
    if (!open) {
      reset({
        name: "",
        subject_id: "",
        status: CLASS_STATUSES.SCHEDULED,
        semester_id: "",
        teacher_id: "",
      });
    }
  }, [open, reset]);

  useActionStateSuccess(
    state,
    isPending,
    (nextState) => {
      if (!nextState.classRow) {
        return;
      }

      onClassCreated(nextState.classRow);
      onOpenChange(false);
    },
    (nextState) => Boolean(nextState.success && nextState.classRow)
  );

  function onSubmit(values: CreateClassInput) {
    const formData = new FormData();
    formData.set("name", values.name);
    formData.set("subject_id", values.subject_id);
    formData.set("status", values.status);
    formData.set(
      "semester_id",
      values.semester_id && values.semester_id !== SEMESTER_UNLINKED
        ? values.semester_id
        : SEMESTER_UNLINKED
    );
    formData.set(
      "teacher_id",
      values.teacher_id && values.teacher_id !== TEACHER_UNASSIGNED
        ? values.teacher_id
        : TEACHER_UNASSIGNED
    );

    startTransition(() => {
      formAction(formData);
    });
  }

  const nameError = errors.name?.message ?? state.fieldErrors?.name?.[0];
  const subjectError =
    errors.subject_id?.message ?? state.fieldErrors?.subject_id?.[0];
  const statusError = errors.status?.message ?? state.fieldErrors?.status?.[0];
  const semesterError = state.fieldErrors?.semester_id?.[0];
  const teacherError =
    errors.teacher_id?.message ?? state.fieldErrors?.teacher_id?.[0];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Add class</DialogTitle>
          <DialogDescription>
            Create a class linked to a subject. Optionally assign a teacher and
            semester.
          </DialogDescription>
        </DialogHeader>

        <form
          id="add-class-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="add-class-name"
              label="Name"
              hint="Required"
            />
            <Input
              id="add-class-name"
              aria-invalid={!!nameError}
              disabled={isPending}
              {...register("name")}
            />
            {nameError ? (
              <p className="text-sm text-destructive">{nameError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="add-class-subject"
              label="Subject"
              hint="Required"
            />
            <Select
              value={selectedSubjectId || null}
              items={subjectSelectItems}
              onValueChange={(value) => {
                if (!value) {
                  return;
                }

                setValue("subject_id", value, { shouldValidate: true });
              }}
              disabled={isPending}
            >
              <SelectTrigger
                id="add-class-subject"
                className="w-full"
                aria-invalid={!!subjectError}
              >
                <SelectValue placeholder="Select a subject" />
              </SelectTrigger>
              <SelectContent align="start">
                {subjectOptions.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {subjectError ? (
              <p className="text-sm text-destructive">{subjectError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="add-class-status"
              label="Status"
              hint="Required"
            />
            <Select
              value={selectedStatus || null}
              items={statusSelectItems}
              onValueChange={(value) => {
                if (!value) {
                  return;
                }

                setValue("status", value as CreateClassInput["status"], {
                  shouldValidate: true,
                });
              }}
              disabled={isPending}
            >
              <SelectTrigger
                id="add-class-status"
                className="w-full"
                aria-invalid={!!statusError}
              >
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent align="start">
                {CLASS_STATUS_VALUES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {MANAGER_CLASS_STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {statusError ? (
              <p className="text-sm text-destructive">{statusError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="add-class-teacher"
              label="Teacher"
              hint="Optional"
            />
            <Select
              value={selectedTeacherId || TEACHER_UNASSIGNED}
              items={teacherSelectItems}
              onValueChange={(value) => {
                setValue("teacher_id", value ?? TEACHER_UNASSIGNED, {
                  shouldValidate: true,
                });
              }}
              disabled={isPending}
            >
              <SelectTrigger
                id="add-class-teacher"
                className="w-full"
                aria-invalid={!!teacherError}
              >
                <SelectValue placeholder="No teacher" />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value={TEACHER_UNASSIGNED}>No teacher</SelectItem>
                {teacherOptions.map((teacher) => {
                  const name = teacher.username ?? "Unnamed user";
                  const roleLabel =
                    MANAGER_USER_ROLE_LABELS[teacher.role] ?? teacher.role;
                  return (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {`${name} (${roleLabel})`}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {teacherError ? (
              <p className="text-sm text-destructive">{teacherError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="add-class-semester"
              label="Semester"
              hint="Optional"
            />
            <Select
              value={selectedSemesterId || SEMESTER_UNLINKED}
              items={semesterSelectItems}
              onValueChange={(value) => {
                setValue("semester_id", value ?? SEMESTER_UNLINKED, {
                  shouldValidate: true,
                });
              }}
              disabled={isPending}
            >
              <SelectTrigger id="add-class-semester" className="w-full">
                <SelectValue placeholder="No semester" />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value={SEMESTER_UNLINKED}>No semester</SelectItem>
                {semesterOptions.map((semester) => (
                  <SelectItem key={semester.id} value={semester.id}>
                    {semester.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {semesterError ? (
              <p className="text-sm text-destructive">{semesterError}</p>
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
          <Button type="submit" form="add-class-form" disabled={isPending}>
            {isPending ? (
              <>
                <InlineSpinner className="mr-2" />
                Creating class
              </>
            ) : (
              "Create class"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
