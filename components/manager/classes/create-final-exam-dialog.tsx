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
import { showSuccessToast } from "@/lib/toast";
import {
  createFinalExamSchema,
  type CreateFinalExamInput,
} from "@/lib/validators/manager/create-final-exam";
import { cn } from "@/lib/utils";
import type { ManagerClassFinalExamRow } from "@/types/manager-class-final-exam";

type CreateFinalExamDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
  className: string;
  onCreateFinalExam: (exam: ManagerClassFinalExamRow) => void;
};

function toDatetimeLocalValue(date: Date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

export function CreateFinalExamDialog({
  open,
  onOpenChange,
  classId,
  className,
  onCreateFinalExam,
}: CreateFinalExamDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateFinalExamInput>({
    resolver: zodResolver(createFinalExamSchema),
    mode: "onBlur",
    defaultValues: {
      title: "Final exam",
      description: "",
      due_date: "",
      max_grade: "100",
    },
  });

  useEffect(() => {
    if (!open) {
      reset({
        title: "Final exam",
        description: "",
        due_date: "",
        max_grade: "100",
      });
      return;
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);
    dueDate.setHours(23, 59, 0, 0);

    reset({
      title: "Final exam",
      description: "",
      due_date: toDatetimeLocalValue(dueDate),
      max_grade: "100",
    });
  }, [open, reset]);

  function onSubmit(values: CreateFinalExamInput) {
    const dueDate = values.due_date?.trim()
      ? new Date(values.due_date)
      : null;

    if (dueDate && Number.isNaN(dueDate.getTime())) {
      return;
    }

    const maxGrade =
      values.max_grade === "" || values.max_grade === undefined
        ? null
        : Number(values.max_grade);

    onCreateFinalExam({
      id: `${classId}-final-exam`,
      class_id: classId,
      title: values.title.trim(),
      description: values.description?.trim() || null,
      due_date: dueDate?.toISOString() ?? null,
      max_grade: maxGrade,
      created_at: new Date().toISOString(),
    });

    showSuccessToast(`Final exam created for ${className}.`);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create final exam</DialogTitle>
          <DialogDescription>
            One final exam per class (final_exam.class_id). Preview-only until
            backend is connected.
          </DialogDescription>
        </DialogHeader>

        <form
          id="create-final-exam-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="create-final-exam-title"
              label="Title"
              hint="Required"
            />
            <Input
              id="create-final-exam-title"
              aria-invalid={!!errors.title}
              {...register("title")}
            />
            {errors.title ? (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="create-final-exam-description"
              label="Description"
              hint="Optional"
            />
            <textarea
              id="create-final-exam-description"
              rows={3}
              aria-invalid={!!errors.description}
              className={cn(
                "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
              )}
              {...register("description")}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="create-final-exam-due-date"
                label="Due date"
                hint="Optional"
              />
              <Input
                id="create-final-exam-due-date"
                type="datetime-local"
                {...register("due_date")}
              />
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="create-final-exam-max-grade"
                label="Max grade"
                hint="Optional"
              />
              <Input
                id="create-final-exam-max-grade"
                type="number"
                min={0}
                max={999}
                step={0.5}
                aria-invalid={!!errors.max_grade}
                {...register("max_grade")}
              />
              {errors.max_grade ? (
                <p className="text-sm text-destructive">
                  {errors.max_grade.message}
                </p>
              ) : null}
            </div>
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
          <Button type="submit" form="create-final-exam-form">
            Create final exam
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
