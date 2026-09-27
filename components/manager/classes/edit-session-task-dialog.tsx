"use client";

import { useEffect, useTransition } from "react";
import { useFormActionState as useActionState } from "@/hooks/use-form-action-state";
import { updateSessionTaskAction } from "@/app/manager/classes/actions";
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
  updateSessionTaskSchema,
  type UpdateSessionTaskInput,
} from "@/lib/validators/manager/update-session-task";
import { toSchoolDateTimeLocalValue } from "@/lib/utils/datetime-local-value";
import { cn } from "@/lib/utils";
import type {
  ManagerSessionTaskRow,
  UpdateSessionTaskActionState,
} from "@/types/manager-class-session-detail";

const initialState: UpdateSessionTaskActionState = {};

type EditSessionTaskDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: ManagerSessionTaskRow;
  classId: string;
  sessionId: string;
  sessionLabel: string;
  onTaskUpdated: (
    task: ManagerSessionTaskRow,
    options?: { gradesClamped?: boolean }
  ) => void;
};

export function EditSessionTaskDialog({
  open,
  onOpenChange,
  task,
  classId,
  sessionId,
  sessionLabel,
  onTaskUpdated,
}: EditSessionTaskDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    updateSessionTaskAction,
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
    schema: updateSessionTaskSchema,
    mode: "onBlur",
    defaultValues: {
      title: task.title,
      description: task.description ?? "",
      due_date: toSchoolDateTimeLocalValue(task.due_date),
      max_grade: task.max_grade ?? "",
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    reset({
      title: task.title,
      description: task.description ?? "",
      due_date: toSchoolDateTimeLocalValue(task.due_date),
      max_grade: task.max_grade ?? "",
    });
  }, [open, reset, task]);

  useActionStateSuccess(
    state,
    isPending,
    (nextState) => {
      if (!nextState.task) {
        return;
      }

      onTaskUpdated(nextState.task, {
        gradesClamped: nextState.gradesClamped,
      });
      onOpenChange(false);
    },
    (nextState) => Boolean(nextState.success && nextState.task)
  );

  function onSubmit(values: UpdateSessionTaskInput) {
    const formData = new FormData();
    formData.set("id", task.id);
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
          <DialogTitle>Edit task</DialogTitle>
          <DialogDescription>
            Update task details for {sessionLabel}.
          </DialogDescription>
        </DialogHeader>

        <form
          id="edit-session-task-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-session-task-title"
              label="Title"
              hint="Required"
            />
            <Input
              id="edit-session-task-title"
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
              htmlFor="edit-session-task-description"
              label="Description"
              hint="Optional"
            />
            <textarea
              id="edit-session-task-description"
              rows={3}
              disabled={isPending}
              className={cn(
                "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
              )}
              {...register("description")}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="edit-session-task-due-date"
                label="Due date"
                hint="Optional"
              />
              <Input
                id="edit-session-task-due-date"
                type="datetime-local"
                disabled={isPending}
                {...register("due_date")}
              />
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="edit-session-task-max-grade"
                label="Max grade"
                hint="Optional"
              />
              <Input
                id="edit-session-task-max-grade"
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
          <Button
            type="submit"
            form="edit-session-task-form"
            disabled={isPending}
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
