"use client";

import { useEffect, useTransition } from "react";
import { useFormActionState as useActionState } from "@/hooks/use-form-action-state";
import { createClassTaskAction } from "@/app/manager/classes/actions";
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
  createClassTaskSchema,
  type CreateClassTaskInput,
} from "@/lib/validators/manager/create-class-task";
import { cn } from "@/lib/utils";
import type {
  CreateClassTaskActionState,
  ManagerClassTaskRow,
} from "@/types/manager-class-session-detail";

const initialState: CreateClassTaskActionState = {};

const DEFAULT_PERIOD_DAYS = 7;
const DEFAULT_MAX_GRADE = 100;

type AddClassTaskDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
  className: string;
  onCreateTask: (task: ManagerClassTaskRow) => void;
};

export function AddClassTaskDialog({
  open,
  onOpenChange,
  classId,
  className,
  onCreateTask,
}: AddClassTaskDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    createClassTaskAction,
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
    schema: createClassTaskSchema,
    mode: "onBlur",
    defaultValues: {
      title: "",
      description: "",
      period: DEFAULT_PERIOD_DAYS,
      max_grade: DEFAULT_MAX_GRADE,
    },
  });

  useEffect(() => {
    reset({
      title: "",
      description: "",
      period: DEFAULT_PERIOD_DAYS,
      max_grade: DEFAULT_MAX_GRADE,
    });
  }, [open, reset]);

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

  function onSubmit(values: CreateClassTaskInput) {
    const formData = new FormData();
    formData.set("class_id", classId);
    formData.set("title", values.title);
    formData.set("description", values.description ?? "");
    formData.set("period", String(values.period));
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
  const periodError = errors.period?.message ?? state.fieldErrors?.period?.[0];
  const descriptionError =
    errors.description?.message ?? state.fieldErrors?.description?.[0];
  const maxGradeError =
    errors.max_grade?.message ?? state.fieldErrors?.max_grade?.[0];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Create task</DialogTitle>
          <DialogDescription>
            Add a task for {className}. Enrolled students get pending
            student task rows automatically. The task stays unstarted until you
            start it.
          </DialogDescription>
        </DialogHeader>

        <form
          id="add-class-task-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="add-class-task-title"
              label="Title"
              hint="Required"
            />
            <Input
              id="add-class-task-title"
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
              htmlFor="add-class-task-description"
              label="Description"
              hint="Optional"
            />
            <textarea
              id="add-class-task-description"
              rows={3}
              aria-invalid={!!descriptionError}
              disabled={isPending}
              className={cn(
                "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
              )}
              {...register("description")}
            />
            {descriptionError ? (
              <p className="text-sm text-destructive">{descriptionError}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="add-class-task-period"
                label="Period (days)"
                hint="Required"
              />
              <Input
                id="add-class-task-period"
                type="number"
                min={1}
                max={3650}
                step={1}
                aria-invalid={!!periodError}
                disabled={isPending}
                {...register("period")}
              />
              {periodError ? (
                <p className="text-sm text-destructive">{periodError}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="add-class-task-max-grade"
                label="Max grade"
                hint="Optional"
              />
              <Input
                id="add-class-task-max-grade"
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
          <Button type="submit" form="add-class-task-form" disabled={isPending}>
            {isPending ? <InlineSpinner /> : null}
            Create task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
