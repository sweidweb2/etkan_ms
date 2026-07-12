"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import { updateStudentFinalExamGradeAction } from "@/app/manager/classes/actions";
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
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useZodForm } from "@/hooks/use-zod-form";
import { MANAGER_STUDENT_TASK_STATUS_LABELS } from "@/lib/constants/manager-student-task-display";
import { STUDENT_TASK_STATUSES } from "@/lib/constants/manager-student-task-status";
import {
  createEditStudentFinalExamGradeSchema,
  STUDENT_FINAL_EXAM_STATUS_VALUES,
  type EditStudentFinalExamGradeInput,
} from "@/lib/validators/manager/edit-student-finalexam-grade";
import { resolveStudentWorkStatusOnSave } from "@/lib/validators/manager/resolve-student-work-status";
import { cn } from "@/lib/utils";
import type { UpdateStudentFinalExamGradeActionState } from "@/types/manager-class-detail";
import type { ManagerStudentFinalExamGradeRow } from "@/types/manager-class-final-exam";

const initialState: UpdateStudentFinalExamGradeActionState = {};

type EditStudentFinalExamGradeSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentGrade: ManagerStudentFinalExamGradeRow | null;
  maxGrade: number | null;
  dueDate?: string | null;
  readOnly?: boolean;
  onStudentGradeUpdated: (row: ManagerStudentFinalExamGradeRow) => void;
};

function toDatetimeLocalValue(value: string | Date | null) {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function getStudentFinalExamFormDefaults(
  studentGrade: ManagerStudentFinalExamGradeRow
) {
  return {
    status: studentGrade.status,
    grade: studentGrade.grade === null ? "" : studentGrade.grade,
    notes: studentGrade.notes ?? "",
    submitted_at: toDatetimeLocalValue(studentGrade.submitted_at),
  };
}

export function EditStudentFinalExamGradeSheet({
  open,
  onOpenChange,
  studentGrade,
  maxGrade,
  dueDate = null,
  readOnly = false,
  onStudentGradeUpdated,
}: EditStudentFinalExamGradeSheetProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    updateStudentFinalExamGradeAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;
  const isFormDisabled = isPending || readOnly;
  const [gradedAtPreview, setGradedAtPreview] = useState(() =>
    toDatetimeLocalValue(new Date())
  );

  const schema = useMemo(
    () => createEditStudentFinalExamGradeSchema(maxGrade, dueDate),
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
    defaultValues: studentGrade
      ? getStudentFinalExamFormDefaults(studentGrade)
      : {
          status: "pending",
          grade: "",
          notes: "",
          submitted_at: "",
        },
  });

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && isPending) {
      return;
    }

    if (nextOpen && studentGrade) {
      setGradedAtPreview(toDatetimeLocalValue(new Date()));
      reset(getStudentFinalExamFormDefaults(studentGrade));
    }

    onOpenChange(nextOpen);
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
      if (!nextState.studentGrade) {
        return;
      }

      onStudentGradeUpdated(nextState.studentGrade);
      onOpenChange(false);
    },
    (nextState) => Boolean(nextState.success && nextState.studentGrade)
  );

  if (!studentGrade) {
    return null;
  }

  function onSubmit(values: EditStudentFinalExamGradeInput) {
    if (!studentGrade || readOnly) {
      return;
    }

    const resolvedStatus = resolveStudentWorkStatusOnSave({
      status: values.status,
      grade: values.grade,
      dueDate,
    });

    const formData = new FormData();
    formData.set("id", studentGrade.id);
    formData.set("status", resolvedStatus);
    formData.set(
      "grade",
      values.grade === undefined || values.grade === ""
        ? ""
        : String(values.grade)
    );
    formData.set("notes", values.notes ?? "");
    formData.set("submitted_at", values.submitted_at ?? "");

    startTransition(() => {
      formAction(formData);
    });
  }

  const statusError = errors.status?.message ?? state.fieldErrors?.status?.[0];
  const gradeError = errors.grade?.message ?? state.fieldErrors?.grade?.[0];
  const notesError = errors.notes?.message ?? state.fieldErrors?.notes?.[0];
  const gradedAtDisplay = gradedAtPreview
    ? format(new Date(gradedAtPreview), "MMM d, yyyy 'at' h:mm a")
    : "—";

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md"
        showCloseButton={!isPending}
      >
        <SheetHeader>
          <SheetTitle>{studentGrade.full_name}</SheetTitle>
          <SheetDescription>
            {readOnly
              ? "View-only while a computed course grade exists for this student. Delete the computed grade to edit."
              : "Edit final exam grade for this student."}
          </SheetDescription>
        </SheetHeader>

        {readOnly ? (
          <p className="mx-4 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/30 dark:text-amber-100">
            Cannot change this student&apos;s grade inputs while a computed
            course grade exists. Delete the computed grade first.
          </p>
        ) : null}

        <form
          id="edit-student-finalexam-grade-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-1 flex-col gap-4 overflow-y-auto px-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-student-finalexam-status"
              label="Status"
              hint="Required"
            />
            <Select
              value={selectedStatus || null}
              onValueChange={(value) => {
                if (!value) {
                  return;
                }

                setValue(
                  "status",
                  value as EditStudentFinalExamGradeInput["status"],
                  { shouldValidate: true }
                );
              }}
              disabled={isFormDisabled}
            >
              <SelectTrigger
                id="edit-student-finalexam-status"
                className="w-full"
                aria-invalid={!!statusError}
              >
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent align="start">
                {STUDENT_FINAL_EXAM_STATUS_VALUES.map((status) => (
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
              htmlFor="edit-student-finalexam-grade"
              label="Grade"
              hint={maxGrade === null ? "Optional" : `Optional · max ${maxGrade}`}
            />
            <Input
              id="edit-student-finalexam-grade"
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
                Grade won&apos;t count as graded until status is Graded or Late.
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-student-finalexam-notes"
              label="Notes"
              hint="Optional"
            />
            <textarea
              id="edit-student-finalexam-notes"
              rows={4}
              aria-invalid={!!notesError}
              disabled={isFormDisabled}
              className={cn(
                "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
              )}
              {...register("notes")}
            />
            {notesError ? (
              <p className="text-sm text-destructive">{notesError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-student-finalexam-submitted-at"
              label="Submitted at"
              hint="Optional"
            />
            <Input
              id="edit-student-finalexam-submitted-at"
              type="datetime-local"
              disabled={isFormDisabled}
              {...register("submitted_at")}
            />
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-student-finalexam-graded-at"
              label="Graded at"
              hint="Automatic on save"
            />
            <Input
              id="edit-student-finalexam-graded-at"
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
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            {readOnly ? "Close" : "Cancel"}
          </Button>
          {readOnly ? null : (
            <Button
              type="submit"
              form="edit-student-finalexam-grade-form"
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
