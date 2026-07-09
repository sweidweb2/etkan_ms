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
import { showSuccessToast } from "@/lib/toast";
import {
  createSessionTaskSchema,
  type CreateSessionTaskInput,
} from "@/lib/validators/manager/create-session-task";
import { cn } from "@/lib/utils";
import type { ManagerSessionTaskRow } from "@/types/manager-class-session-detail";

type AddSessionTaskDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  sessionLabel: string;
  nextTaskId: string;
  defaultDueDate?: string;
  onCreateTask: (task: ManagerSessionTaskRow) => void;
};

function toDatetimeLocalValue(date: Date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

export function AddSessionTaskDialog({
  open,
  onOpenChange,
  sessionId,
  sessionLabel,
  nextTaskId,
  defaultDueDate,
  onCreateTask,
}: AddSessionTaskDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useZodForm({
    schema: createSessionTaskSchema,
    mode: "onBlur",
    defaultValues: {
      title: "",
      description: "",
      due_date: "",
      max_grade: "",
    },
  });

  useEffect(() => {
    if (!open) {
      reset({
        title: "",
        description: "",
        due_date: "",
        max_grade: "",
      });
      return;
    }

    reset({
      title: "",
      description: "",
      due_date: defaultDueDate ?? toDatetimeLocalValue(new Date()),
      max_grade: 20,
    });
  }, [defaultDueDate, open, reset]);

  function onSubmit(values: CreateSessionTaskInput) {
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

    onCreateTask({
      id: nextTaskId,
      session_id: sessionId,
      title: values.title.trim(),
      description: values.description?.trim() || null,
      due_date: dueDate?.toISOString() ?? null,
      max_grade: maxGrade,
      created_at: new Date().toISOString(),
    });

    showSuccessToast(`Task added to ${sessionLabel}.`);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create task</DialogTitle>
          <DialogDescription>
            Add a task for {sessionLabel}. Preview-only until backend is
            connected.
          </DialogDescription>
        </DialogHeader>

        <form
          id="add-session-task-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="add-session-task-title"
              label="Title"
              hint="Required"
            />
            <Input
              id="add-session-task-title"
              aria-invalid={!!errors.title}
              {...register("title")}
            />
            {errors.title ? (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="add-session-task-description"
              label="Description"
              hint="Optional"
            />
            <textarea
              id="add-session-task-description"
              rows={3}
              aria-invalid={!!errors.description}
              className={cn(
                "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
              )}
              {...register("description")}
            />
            {errors.description ? (
              <p className="text-sm text-destructive">
                {errors.description.message}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="add-session-task-due-date"
                label="Due date"
                hint="Optional"
              />
              <Input
                id="add-session-task-due-date"
                type="datetime-local"
                aria-invalid={!!errors.due_date}
                {...register("due_date")}
              />
              {errors.due_date ? (
                <p className="text-sm text-destructive">
                  {errors.due_date.message}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="add-session-task-max-grade"
                label="Max grade"
                hint="Optional"
              />
              <Input
                id="add-session-task-max-grade"
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
          <Button type="submit" form="add-session-task-form">
            Create task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
