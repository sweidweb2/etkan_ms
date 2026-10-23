"use client";

import { useMemo, useState, useTransition } from "react";
import { useFormActionState as useActionState } from "@/hooks/use-form-action-state";
import { format } from "date-fns";
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
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { useZodForm } from "@/hooks/use-zod-form";
import { MANAGER_STUDENT_TASK_STATUS_LABELS } from "@/lib/constants/manager-student-task-display";
import { STUDENT_TASK_STATUSES } from "@/lib/constants/manager-student-task-status";
import {
  createEditStudentTaskSchema,
  resolveStudentTaskStatusOnSave,
  STUDENT_TASK_STATUS_VALUES,
  type EditStudentTaskInput,
} from "@/lib/validators/manager/edit-student-task";
import { cn } from "@/lib/utils";
import type {
  ManagerStudentTaskRow,
  UpdateStudentTaskActionState,
} from "@/types/manager-class-session-detail";

const initialState: UpdateStudentTaskActionState = {};

type UpdateStudentTaskFormAction = (
  prevState: UpdateStudentTaskActionState,
  formData: FormData
) => Promise<UpdateStudentTaskActionState>;

type EditStudentTaskSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentTask: ManagerStudentTaskRow | null;
  maxGrade: number | null;
  dueDate?: string | null;
  readOnly?: boolean;
  onUpdateStudentTask: (studentTask: ManagerStudentTaskRow) => void;
  /** Defaults to manager update action; teacher panel passes its own. */
  action?: UpdateStudentTaskFormAction;
};

function toDatetimeLocalValue(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function getStudentTaskFormDefaults(studentTask: ManagerStudentTaskRow) {
  return {
    status: studentTask.status,
    grade: studentTask.grade === null ? "" : studentTask.grade,
    notes: studentTask.notes ?? "",
    student_report: studentTask.student_report ?? "",
    submitted_at: studentTask.submitted_at
      ? toDatetimeLocalValue(studentTask.submitted_at)
      : "",
  };
}

export function EditStudentTaskSheet({
  open,
  onOpenChange,
  studentTask,
  maxGrade,
  dueDate = null,
  readOnly = false,
  onUpdateStudentTask,
  action = updateStudentTaskAction,
}: EditStudentTaskSheetProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    action,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;
  const isFormDisabled = isPending || readOnly;
  const [gradedAtPreview, setGradedAtPreview] = useState(() =>
    toDatetimeLocalValue(new Date())
  );

  const schema = useMemo(
    () => createEditStudentTaskSchema(maxGrade, dueDate),
    [dueDate, maxGrade]
  );

  useActionStateToast(state, isPending);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useZodForm({
    schema,
    mode: "onBlur",
    defaultValues: studentTask
      ? getStudentTaskFormDefaults(studentTask)
      : {
          status: "pending",
          grade: "",
          notes: "",
          student_report: "",
          submitted_at: "",
        },
  });

  const pendingAwareOpenChange = usePendingAwareOpenChange(isPending, onOpenChange);

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen && studentTask) {
      setGradedAtPreview(toDatetimeLocalValue(new Date()));
      reset(getStudentTaskFormDefaults(studentTask));
    }

    pendingAwareOpenChange(nextOpen);
  }

  const selectedStatus = watch("status");
  const gradeValue = watch("grade");
  const hasGradeValue =
    gradeValue !== undefined &&
    gradeValue !== "" &&
    !Number.isNaN(Number(gradeValue));
  const showAnalyticsHint =
    hasGradeValue &&
    selectedStatus !== STUDENT_TASK_STATUSES.GRADED &&
    selectedStatus !== STUDENT_TASK_STATUSES.LATE &&
    selectedStatus !== STUDENT_TASK_STATUSES.PENDING &&
    selectedStatus !== STUDENT_TASK_STATUSES.MISSING;

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
    if (!studentTask || readOnly) {
      return;
    }

    const resolvedStatus = resolveStudentTaskStatusOnSave({
      status: values.status,
      grade: values.grade,
      dueDate,
    });

    const formData = new FormData();
    formData.set("id", studentTask.id);
    formData.set("status", resolvedStatus);
    formData.set(
      "grade",
      values.grade === undefined || values.grade === ""
        ? ""
        : String(values.grade)
    );
    formData.set("notes", values.notes ?? "");
    formData.set("student_report", values.student_report ?? "");
    formData.set("submitted_at", values.submitted_at ?? "");

    startTransition(() => {
      formAction(formData);
    });
  }

  const statusError = errors.status?.message ?? state.fieldErrors?.status?.[0];
  const gradeError = errors.grade?.message ?? state.fieldErrors?.grade?.[0];
  const notesError = errors.notes?.message ?? state.fieldErrors?.notes?.[0];
  const studentReportError =
    errors.student_report?.message ?? state.fieldErrors?.student_report?.[0];
  const gradedAtDisplay = gradedAtPreview
    ? format(new Date(gradedAtPreview), "MMM d, yyyy 'at' h:mm a")
    : "—";

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md" showCloseButton={!isPending}>
        <SheetHeader>
          <SheetTitle>{studentTask.full_name}</SheetTitle>
          <SheetDescription>
            {readOnly
              ? "View-only while a computed course grade exists for this student. Delete the computed grade to edit."
              : "Edit student_tasks fields for this assignment."}
          </SheetDescription>
        </SheetHeader>

        {readOnly ? (
          <p className="mx-4 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/30 dark:text-amber-100">
            Cannot change this student&apos;s grade inputs while a computed
            course grade exists. Delete the computed grade first.
          </p>
        ) : null}

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
              disabled={isFormDisabled}
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
              max={maxGrade ?? undefined}
              step={0.5}
              aria-invalid={!!gradeError}
              disabled={isFormDisabled}
              {...register("grade")}
            />
            {gradeError ? (
              <p className="text-sm text-destructive">{gradeError}</p>
            ) : null}
            {showAnalyticsHint ? (
              <p className="text-sm text-muted-foreground">
                Grade won&apos;t appear in class analytics until status is
                Graded or Late.
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-student-task-notes"
              label="Notes"
              hint="Optional · staff"
            />
            <textarea
              id="edit-student-task-notes"
              rows={4}
              aria-invalid={!!notesError}
              disabled={isFormDisabled}
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
              htmlFor="edit-student-task-report"
              label="Student report"
              hint="Optional"
            />
            <textarea
              id="edit-student-task-report"
              rows={5}
              aria-invalid={!!studentReportError}
              disabled={isFormDisabled}
              className={cn(
                "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
              )}
              {...register("student_report")}
            />
            {studentReportError ? (
              <p className="text-sm text-destructive">{studentReportError}</p>
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
              disabled={isFormDisabled}
              {...register("submitted_at")}
            />
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-student-task-graded-at"
              label="Graded at"
              hint="Automatic on save"
            />
            <Input
              id="edit-student-task-graded-at"
              type="text"
              readOnly
              tabIndex={-1}
              value={gradedAtDisplay}
              disabled
              className="bg-muted/50"
            />
          </div>
        </form>

        <SheetFooter className="mt-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => handleOpenChange(false)}
          >
            {readOnly ? "Close" : "Cancel"}
          </Button>
          {readOnly ? null : (
            <Button
              type="submit"
              form="edit-student-task-form"
              disabled={isPending}
            >
              {isPending ? <InlineSpinner /> : null}
              Save changes
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
