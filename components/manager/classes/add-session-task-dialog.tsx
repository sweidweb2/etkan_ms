"use client";

import { useActionState, useEffect, useTransition } from "react";
import { createSessionTaskAction } from "@/app/manager/classes/actions";
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
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { useZodForm } from "@/hooks/use-zod-form";
import {
  createSessionTaskSchema,
  type CreateSessionTaskInput,
} from "@/lib/validators/manager/create-session-task";
import { cn } from "@/lib/utils";
import type {
  CreateSessionTaskActionState,
  ManagerSessionTaskRow,
} from "@/types/manager-class-session-detail";

const initialState: CreateSessionTaskActionState = {};

type AddSessionTaskDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
  sessionId: string;
  sessionLabel: string;
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
  classId,
  sessionId,
  sessionLabel,
  defaultDueDate,
  onCreateTask,
}: AddSessionTaskDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    createSessionTaskAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;

  const handleOpenChange = usePendingAwareOpenChange(isPending, onOpenChange);

  useActionStateToast(state, isPending);

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
      max_grade: 100,
    },
  });

  useEffect(() => {
    if (!open) {
      reset({
        title: "",
        description: "",
        due_date: "",
        max_grade: 100,
      });
      return;
    }

    reset({
      title: "",
      description: "",
      due_date: defaultDueDate ?? toDatetimeLocalValue(new Date()),
      max_grade: 100,
    });
  }, [defaultDueDate, open, reset]);

  useActionStateSuccess(
    state,
    isPending,
    (nextState) => {
      if (!nextState.task) {
        return;
      }

      onCreateTask(nextState.task);
      onOpenChange(false);
    },
    (nextState) => Boolean(nextState.success && nextState.task)
  );

  function onSubmit(values: CreateSessionTaskInput) {
    const formData = new FormData();
    formData.set("class_id", classId);
    formData.set("session_id", sessionId);
    formData.set("title", values.title);
    formData.set("description", values.description ?? "");
    formData.set("due_date", values.due_date ?? "");
    formData.set(
      "max_grade",
      values.max_grade === undefined || values.max_grade === ""
        ? ""
        : String(values.max_grade)
    );

    startTransition(() => {
      formAction(formData);
    });
  }

  const titleError = errors.title?.message ?? state.fieldErrors?.title?.[0];
  const maxGradeError =
    errors.max_grade?.message ?? state.fieldErrors?.max_grade?.[0];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Create task</DialogTitle>
          <DialogDescription>
            Add a task for {sessionLabel}. Enrolled students get pending
            student_tasks rows automatically.
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
              aria-invalid={!!titleError}
              disabled={isPending}
              {...register("title")}
            />
            {titleError ? (
              <p className="text-sm text-destructive">{titleError}</p>
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
              disabled={isPending}
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
                disabled={isPending}
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
                aria-invalid={!!maxGradeError}
                disabled={isPending}
                {...register("max_grade")}
              />
              {maxGradeError ? (
                <p className="text-sm text-destructive">{maxGradeError}</p>
              ) : null}
            </div>
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
          <Button type="submit" form="add-session-task-form" disabled={isPending}>
            {isPending ? <InlineSpinner /> : null}
            Create task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
