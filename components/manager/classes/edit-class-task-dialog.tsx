"use client";

import { useEffect, useTransition } from "react";
import { useFormActionState as useActionState } from "@/hooks/use-form-action-state";
import { updateClassTaskAction } from "@/app/manager/classes/actions";
import { FieldLabel } from "@/components/auth/field-label";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { TaskYesNoField } from "@/components/manager/shared/task-yes-no-field";
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
import {
  serializeTaskMaxGrade,
  useTaskYesNoToggle,
} from "@/hooks/use-task-yes-no-toggle";
import { useZodForm } from "@/hooks/use-zod-form";
import { YES_NO_LOCKED_MESSAGE } from "@/lib/constants/task-yes-no";
import {
  updateClassTaskSchema,
  type UpdateClassTaskInput,
} from "@/lib/validators/manager/update-class-task";
import { cn } from "@/lib/utils";
import type {
  ManagerClassTaskRow,
  UpdateClassTaskActionState,
} from "@/types/manager-class-session-detail";

const initialState: UpdateClassTaskActionState = {};

type EditClassTaskDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: ManagerClassTaskRow;
  classId: string;
  className: string;
  /** Yes/No can't change once any student task on this task has a grade. */
  hasGradedStudents?: boolean;
  onTaskUpdated: (
    task: ManagerClassTaskRow,
    options?: { gradesClamped?: boolean }
  ) => void;
};

function getDefaultValues(task: ManagerClassTaskRow) {
  return {
    title: task.title,
    description: task.description ?? "",
    period: task.period,
    max_grade: task.max_grade ?? "",
    is_yes_no: task.is_yes_no,
    sort_order: task.sort_order,
  };
}

export function EditClassTaskDialog({
  open,
  onOpenChange,
  task,
  classId,
  className,
  hasGradedStudents = false,
  onTaskUpdated,
}: EditClassTaskDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    updateClassTaskAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;

  const handleOpenChange = usePendingAwareOpenChange(isPending, onOpenChange);

  useActionStateToast(state, isPending);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useZodForm({
    schema: updateClassTaskSchema,
    mode: "onBlur",
    defaultValues: getDefaultValues(task),
  });
  const isYesNo = Boolean(watch("is_yes_no"));
  const { onYesNoChange, resetYesNoToggle } = useTaskYesNoToggle({
    getMaxGrade: () => getValues("max_grade"),
    setMaxGrade: (value) =>
      setValue("max_grade", value, { shouldValidate: true }),
    setIsYesNo: (value) =>
      setValue("is_yes_no", value, { shouldDirty: true }),
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    reset(getDefaultValues(task));
    resetYesNoToggle();
  }, [open, reset, resetYesNoToggle, task]);

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

  function onSubmit(values: UpdateClassTaskInput) {
    const formData = new FormData();
    formData.set("id", task.id);
    formData.set("class_id", classId);
    formData.set("title", values.title);
    formData.set("description", values.description ?? "");
    formData.set("period", String(values.period));
    formData.set("sort_order", String(values.sort_order));
    formData.set("is_yes_no", values.is_yes_no ? "true" : "false");
    formData.set(
      "max_grade",
      serializeTaskMaxGrade(values.max_grade, values.is_yes_no)
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
          <DialogTitle>Edit task</DialogTitle>
          <DialogDescription>
            Update task details for {className}. Changing the period does not
            move the due date of an already started task.
          </DialogDescription>
        </DialogHeader>

        <form
          id="edit-class-task-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-class-task-title"
              label="Title"
              hint="Required"
            />
            <Input
              id="edit-class-task-title"
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
              htmlFor="edit-class-task-description"
              label="Description"
              hint="Optional"
            />
            <textarea
              id="edit-class-task-description"
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

          <TaskYesNoField
            id="edit-class-task-yes-no"
            checked={isYesNo}
            onCheckedChange={onYesNoChange}
            disabled={isPending}
            lockedReason={hasGradedStudents ? YES_NO_LOCKED_MESSAGE : null}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="edit-class-task-period"
                label="Period (days)"
                hint="Required"
              />
              <Input
                id="edit-class-task-period"
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

            {isYesNo ? null : (
              <div className="flex flex-col gap-2">
                <FieldLabel
                  htmlFor="edit-class-task-max-grade"
                  label="Max grade"
                  hint="Optional"
                />
                <Input
                  id="edit-class-task-max-grade"
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
            )}
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
            form="edit-class-task-form"
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
