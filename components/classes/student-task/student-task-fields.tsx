"use client";

import { format } from "date-fns";
import type {
  FieldErrors as RHFFieldErrors,
  FieldValues,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";
import {
  shouldShowStudentTaskAnalyticsHint,
  STUDENT_TASK_TEXTAREA_CLASS,
} from "@/components/classes/student-task/student-task-form-utils";
import { FieldLabel } from "@/components/auth/field-label";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MANAGER_STUDENT_TASK_STATUS_LABELS } from "@/lib/constants/manager-student-task-display";
import {
  STUDENT_TASK_STATUS_VALUES,
  type EditStudentTaskInput,
} from "@/lib/validators/manager/edit-student-task";
import { cn } from "@/lib/utils";
import type { FieldErrors } from "@/types/auth";

type StudentTaskFieldsProps = {
  idPrefix: string;
  maxGrade: number | null;
  disabled: boolean;
  /** useZodForm output; kept loose to avoid zod/RHF grade type friction. */
  register: UseFormRegister<FieldValues>;
  setValue: UseFormSetValue<FieldValues>;
  watch: UseFormWatch<FieldValues>;
  errors: RHFFieldErrors<FieldValues>;
  fieldErrors?: FieldErrors;
  gradedAtDisplay: string;
  /** `stack` for sheet; `grid` for workspace inline. */
  layout?: "stack" | "grid";
  notesRows?: number;
  reportRows?: number;
};

export function StudentTaskFields({
  idPrefix,
  maxGrade,
  disabled,
  register,
  setValue,
  watch,
  errors,
  fieldErrors,
  gradedAtDisplay,
  layout = "stack",
  notesRows = 4,
  reportRows = 5,
}: StudentTaskFieldsProps) {
  const selectedStatus = watch("status") as EditStudentTaskInput["status"];
  const gradeValue = watch("grade") as EditStudentTaskInput["grade"];
  const showAnalyticsHint = shouldShowStudentTaskAnalyticsHint(
    gradeValue,
    selectedStatus
  );

  const statusError =
    (typeof errors.status?.message === "string"
      ? errors.status.message
      : undefined) ?? fieldErrors?.status?.[0];
  const gradeError =
    (typeof errors.grade?.message === "string"
      ? errors.grade.message
      : undefined) ?? fieldErrors?.grade?.[0];
  const notesError =
    (typeof errors.notes?.message === "string"
      ? errors.notes.message
      : undefined) ?? fieldErrors?.notes?.[0];
  const studentReportError =
    (typeof errors.student_report?.message === "string"
      ? errors.student_report.message
      : undefined) ?? fieldErrors?.student_report?.[0];

  const statusAndGrade = (
    <>
      <div className="flex flex-col gap-2">
        <FieldLabel
          htmlFor={`${idPrefix}-status`}
          label="Status"
          hint="Required"
        />
        <Select
          value={selectedStatus || null}
          disabled={disabled}
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
            id={`${idPrefix}-status`}
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
          htmlFor={`${idPrefix}-grade`}
          label="Grade"
          hint={maxGrade === null ? "Optional" : `Optional · max ${maxGrade}`}
        />
        <Input
          id={`${idPrefix}-grade`}
          type="number"
          min={0}
          max={maxGrade ?? undefined}
          step={0.5}
          aria-invalid={!!gradeError}
          disabled={disabled}
          {...register("grade")}
        />
        {gradeError ? (
          <p className="text-sm text-destructive">{gradeError}</p>
        ) : null}
        {showAnalyticsHint ? (
          <p className="text-sm text-muted-foreground">
            Grade won&apos;t appear in class analytics until status is Graded or
            Late.
          </p>
        ) : null}
      </div>
    </>
  );

  const submittedAndGraded = (
    <>
      <div className="flex flex-col gap-2">
        <FieldLabel
          htmlFor={`${idPrefix}-submitted-at`}
          label="Submitted at"
          hint="Optional"
        />
        <DateTimePicker
          id={`${idPrefix}-submitted-at`}
          value={(watch("submitted_at") as string | undefined) ?? ""}
          onChange={(next) =>
            setValue("submitted_at", next, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
          allowClear
          aria-invalid={!!errors.submitted_at}
          disabled={disabled}
        />
      </div>

      <div className="flex flex-col gap-2">
        <FieldLabel
          htmlFor={`${idPrefix}-graded-at`}
          label="Graded at"
          hint="Automatic on save"
        />
        <Input
          id={`${idPrefix}-graded-at`}
          type="text"
          readOnly
          tabIndex={-1}
          value={gradedAtDisplay}
          disabled
          className="bg-muted/50"
        />
      </div>
    </>
  );

  return (
    <>
      {layout === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2">{statusAndGrade}</div>
      ) : (
        statusAndGrade
      )}

      <div className="flex flex-col gap-2">
        <FieldLabel
          htmlFor={`${idPrefix}-notes`}
          label="Notes"
          hint="Optional · staff"
        />
        <textarea
          id={`${idPrefix}-notes`}
          rows={notesRows}
          aria-invalid={!!notesError}
          disabled={disabled}
          className={cn(STUDENT_TASK_TEXTAREA_CLASS)}
          {...register("notes")}
        />
        {notesError ? (
          <p className="text-sm text-destructive">{notesError}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <FieldLabel
          htmlFor={`${idPrefix}-report`}
          label="Student report"
          hint="Optional"
        />
        <textarea
          id={`${idPrefix}-report`}
          rows={reportRows}
          aria-invalid={!!studentReportError}
          disabled={disabled}
          className={cn(STUDENT_TASK_TEXTAREA_CLASS)}
          {...register("student_report")}
        />
        {studentReportError ? (
          <p className="text-sm text-destructive">{studentReportError}</p>
        ) : null}
      </div>

      {layout === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2">{submittedAndGraded}</div>
      ) : (
        submittedAndGraded
      )}
    </>
  );
}

export function formatGradedAtDisplay(value: string) {
  if (!value) {
    return "—";
  }
  return format(new Date(value), "MMM d, yyyy 'at' h:mm a");
}
