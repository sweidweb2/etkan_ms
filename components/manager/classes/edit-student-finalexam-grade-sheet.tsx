"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FieldLabel } from "@/components/auth/field-label";
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
import { MANAGER_STUDENT_TASK_STATUS_LABELS } from "@/lib/constants/manager-student-task-display";
import { showSuccessToast } from "@/lib/toast";
import {
  editStudentFinalExamGradeSchema,
  STUDENT_FINAL_EXAM_STATUS_VALUES,
  type EditStudentFinalExamGradeInput,
} from "@/lib/validators/manager/edit-student-finalexam-grade";
import { cn } from "@/lib/utils";
import type { ManagerStudentFinalExamGradeRow } from "@/types/manager-class-final-exam";

type EditStudentFinalExamGradeSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentGrade: ManagerStudentFinalExamGradeRow | null;
  maxGrade: number | null;
  onUpdateStudentGrade: (row: ManagerStudentFinalExamGradeRow) => void;
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

function parseOptionalDatetime(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function EditStudentFinalExamGradeSheet({
  open,
  onOpenChange,
  studentGrade,
  maxGrade,
  onUpdateStudentGrade,
}: EditStudentFinalExamGradeSheetProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EditStudentFinalExamGradeInput>({
    resolver: zodResolver(editStudentFinalExamGradeSchema),
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
    if (!open || !studentGrade) {
      return;
    }

    reset({
      status: studentGrade.status,
      grade: studentGrade.grade === null ? "" : String(studentGrade.grade),
      notes: studentGrade.notes ?? "",
      submitted_at: toDatetimeLocalValue(studentGrade.submitted_at),
      graded_at: toDatetimeLocalValue(studentGrade.graded_at),
    });
  }, [open, reset, studentGrade]);

  if (!studentGrade) {
    return null;
  }

  function onSubmit(values: EditStudentFinalExamGradeInput) {
    if (!studentGrade) {
      return;
    }

    onUpdateStudentGrade({
      ...studentGrade,
      status: values.status,
      grade:
        values.grade === "" || values.grade === undefined
          ? null
          : Number(values.grade),
      notes: values.notes?.trim() || null,
      submitted_at: parseOptionalDatetime(values.submitted_at),
      graded_at: parseOptionalDatetime(values.graded_at),
    });
    showSuccessToast(`${studentGrade.full_name}'s final exam record updated.`);
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{studentGrade.full_name}</SheetTitle>
          <SheetDescription>
            Edit student_finalexam_grade for this class final exam.
            Preview-only until backend is connected.
          </SheetDescription>
        </SheetHeader>

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
            >
              <SelectTrigger
                id="edit-student-finalexam-status"
                className="w-full"
                aria-invalid={!!errors.status}
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
            {errors.status ? (
              <p className="text-sm text-destructive">{errors.status.message}</p>
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
              max={maxGrade ?? 999}
              step={0.5}
              aria-invalid={!!errors.grade}
              {...register("grade")}
            />
            {errors.grade ? (
              <p className="text-sm text-destructive">{errors.grade.message}</p>
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
              aria-invalid={!!errors.notes}
              className={cn(
                "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
              )}
              {...register("notes")}
            />
            {errors.notes ? (
              <p className="text-sm text-destructive">{errors.notes.message}</p>
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
              {...register("submitted_at")}
            />
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-student-finalexam-graded-at"
              label="Graded at"
              hint="Optional"
            />
            <Input
              id="edit-student-finalexam-graded-at"
              type="datetime-local"
              {...register("graded_at")}
            />
          </div>
        </form>

        <SheetFooter className="mt-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" form="edit-student-finalexam-grade-form">
            Save changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
