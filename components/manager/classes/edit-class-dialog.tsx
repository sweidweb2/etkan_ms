"use client";

import { useActionState, useEffect, useTransition } from "react";
import { updateClassAction } from "@/app/manager/classes/actions";
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
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useZodForm } from "@/hooks/use-zod-form";
import { CLASS_STATUSES } from "@/lib/constants/manager-class-status";
import { MANAGER_CLASS_STATUS_LABELS } from "@/lib/constants/manager-class-display";
import {
  CLASS_STATUS_VALUES,
  updateClassSchema,
  type UpdateClassInput,
} from "@/lib/validators/manager/update-class";
import type {
  ManagerClassSemesterOption,
  ManagerClassSubjectOption,
  UpdateClassActionState,
} from "@/types/manager-class-detail";
import type { ManagerClassRow } from "@/types/manager-class-list";

const SEMESTER_UNLINKED = "unlinked";
const initialState: UpdateClassActionState = {};

type EditClassDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classRow: ManagerClassRow | null;
  subjectOptions: ManagerClassSubjectOption[];
  semesterOptions: ManagerClassSemesterOption[];
  onClassUpdated: (classRow: ManagerClassRow) => void;
};

export function EditClassDialog({
  open,
  onOpenChange,
  classRow,
  subjectOptions,
  semesterOptions,
  onClassUpdated,
}: EditClassDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    updateClassAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;

  useActionStateToast(state, isPending);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useZodForm({
    schema: updateClassSchema,
    mode: "onBlur",
    defaultValues: {
      name: "",
      subject_id: "",
      status: CLASS_STATUSES.SCHEDULED,
      semester_id: "",
    },
  });

  const selectedSubjectId = watch("subject_id");
  const selectedStatus = watch("status");
  const selectedSemesterId = watch("semester_id");

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

  useEffect(() => {
    if (!open || !classRow) {
      return;
    }

    reset({
      name: classRow.name,
      subject_id: classRow.subject_id,
      status: classRow.status as UpdateClassInput["status"],
      semester_id: classRow.semester_id ?? SEMESTER_UNLINKED,
    });
  }, [classRow, open, reset]);

  useActionStateSuccess(
    state,
    isPending,
    (nextState) => {
      if (!nextState.classRow) {
        return;
      }

      onClassUpdated(nextState.classRow);
      onOpenChange(false);
    },
    (nextState) => Boolean(nextState.success && nextState.classRow)
  );

  function onSubmit(values: UpdateClassInput) {
    if (!classRow) {
      return;
    }

    const formData = new FormData();
    formData.set("class_id", classRow.id);
    formData.set("name", values.name);
    formData.set("subject_id", values.subject_id);
    formData.set("status", values.status);
    formData.set(
      "semester_id",
      values.semester_id && values.semester_id !== SEMESTER_UNLINKED
        ? values.semester_id
        : SEMESTER_UNLINKED
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit class</DialogTitle>
          <DialogDescription>
            Update class details for {classRow?.name ?? "this class"}.
          </DialogDescription>
        </DialogHeader>

        <form
          id="edit-class-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-class-name"
              label="Name"
              hint="Required"
            />
            <Input
              id="edit-class-name"
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
              htmlFor="edit-class-subject"
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
                id="edit-class-subject"
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
              htmlFor="edit-class-status"
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

                setValue("status", value as UpdateClassInput["status"], {
                  shouldValidate: true,
                });
              }}
              disabled={isPending}
            >
              <SelectTrigger
                id="edit-class-status"
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
              htmlFor="edit-class-semester"
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
              <SelectTrigger id="edit-class-semester" className="w-full">
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
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-class-form"
            disabled={!classRow || isPending}
          >
            {isPending ? (
              <>
                <InlineSpinner className="mr-2" />
                Saving
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
