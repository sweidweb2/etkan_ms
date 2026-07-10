"use client";

import { useActionState, useEffect, useTransition } from "react";
import { updateStudentTaskAction } from "@/app/manager/classes/actions";
import { FieldLabel } from "@/components/auth/field-label";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { useZodForm } from "@/hooks/use-zod-form";
import { MANAGER_STUDENT_TASK_STATUS_LABELS } from "@/lib/constants/manager-student-task-display";
import {
  editStudentTaskSchema,
  STUDENT_TASK_STATUS_VALUES,
  type EditStudentTaskInput,
} from "@/lib/validators/manager/edit-student-task";
import { cn } from "@/lib/utils";
import type {
  ManagerStudentTaskRow,
  UpdateStudentTaskActionState,
} from "@/types/manager-class-session-detail";

const initialState: UpdateStudentTaskActionState = {};

type EditStudentTaskSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentTask: ManagerStudentTaskRow | null;
  maxGrade: number | null;
  onUpdateStudentTask: (studentTask: ManagerStudentTaskRow) => void;
};

function toDatetimeLocalValue(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

export function EditStudentTaskSheet({
  open,
  onOpenChange,
  studentTask,
  maxGrade,
  onUpdateStudentTask,
}: EditStudentTaskSheetProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    updateStudentTaskAction,
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
    schema: editStudentTaskSchema,
    mode: "onBlur",
    defaultValues: {
      status: "pending",
      grade: "",
      notes: "",
      submitted_at: "",
      graded_at: "",
    },
  });

  const selectedStatus = watch("status");

  useEffect(() => {
    if (!open || !studentTask) {
      return;
    }

    reset({
      status: studentTask.status,
      grade: studentTask.grade === null ? "" : studentTask.grade,
      notes: studentTask.notes ?? "",
      submitted_at: toDatetimeLocalValue(studentTask.submitted_at),
      graded_at: toDatetimeLocalValue(studentTask.graded_at),
    });
  }, [open, reset, studentTask]);

  useActionStateSuccess(
    state,
    isPending,
    (nextState) => {
      if (!nextState.studentTask) {
        return;
      }

      onUpdateStudentTask(nextState.studentTask);
      onOpenChange(false);
    },
    (nextState) => Boolean(nextState.success && nextState.studentTask)
  );

  if (!studentTask) {
    return null;
  }

  function onSubmit(values: EditStudentTaskInput) {
    if (!studentTask) {
      return;
    }

    const formData = new FormData();
    formData.set("id", studentTask.id);
    formData.set("status", values.status);
    formData.set(
      "grade",
      values.grade === undefined || values.grade === ""
        ? ""
        : String(values.grade)
    );
    formData.set("notes", values.notes ?? "");
    formData.set("submitted_at", values.submitted_at ?? "");
    formData.set("graded_at", values.graded_at ?? "");

    startTransition(() => {
      formAction(formData);
    });
  }

  const statusError = errors.status?.message ?? state.fieldErrors?.status?.[0];
  const gradeError = errors.grade?.message ?? state.fieldErrors?.grade?.[0];
  const notesError = errors.notes?.message ?? state.fieldErrors?.notes?.[0];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{studentTask.full_name}</SheetTitle>
          <SheetDescription>
            Edit student_tasks fields for this assignment.
          </SheetDescription>
        </SheetHeader>

        <form
          id="edit-student-task-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-1 flex-col gap-4 overflow-y-auto px-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-student-task-status"
              label="Status"
              hint="Required"
            />
            <Select
              value={selectedStatus || null}
              disabled={isPending}
              onValueChange={(value) => {
                if (!value) {
                  return;
                }

                setValue("status", value as EditStudentTaskInput["status"], {
                  shouldValidate: true,
                });
              }}
            >
              <SelectTrigger
                id="edit-student-task-status"
                className="w-full"
                aria-invalid={!!statusError}
              >
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent align="start">
                {STUDENT_TASK_STATUS_VALUES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {MANAGER_STUDENT_TASK_STATUS_LABELS[status]}
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
              htmlFor="edit-student-task-grade"
              label="Grade"
              hint={maxGrade === null ? "Optional" : `Optional · max ${maxGrade}`}
            />
            <Input
              id="edit-student-task-grade"
              type="number"
              min={0}
              max={maxGrade ?? 999}
              step={0.5}
              aria-invalid={!!gradeError}
              disabled={isPending}
              {...register("grade")}
            />
            {gradeError ? (
              <p className="text-sm text-destructive">{gradeError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-student-task-notes"
              label="Notes"
              hint="Optional"
            />
            <textarea
              id="edit-student-task-notes"
              rows={4}
              aria-invalid={!!notesError}
              disabled={isPending}
              className={cn(
                "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
              )}
              {...register("notes")}
            />
            {notesError ? (
              <p className="text-sm text-destructive">{notesError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-student-task-submitted-at"
              label="Submitted at"
              hint="Optional"
            />
            <Input
              id="edit-student-task-submitted-at"
              type="datetime-local"
              aria-invalid={!!errors.submitted_at}
              disabled={isPending}
              {...register("submitted_at")}
            />
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-student-task-graded-at"
              label="Graded at"
              hint="Optional"
            />
            <Input
              id="edit-student-task-graded-at"
              type="datetime-local"
              aria-invalid={!!errors.graded_at}
              disabled={isPending}
              {...register("graded_at")}
            />
          </div>
        </form>

        <SheetFooter className="mt-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-student-task-form"
            disabled={isPending}
          >
            {isPending ? <InlineSpinner /> : null}
            Save changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
