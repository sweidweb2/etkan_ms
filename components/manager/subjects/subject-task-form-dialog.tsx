"use client";

import { useEffect, useTransition } from "react";
import { useFormActionState as useActionState } from "@/hooks/use-form-action-state";
import {
  createSubjectTaskAction,
  updateSubjectTaskAction,
} from "@/app/manager/subjects/actions";
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
import {
  subjectTaskFieldsSchema,
} from "@/lib/validators/manager/create-subject-task";
import { cn } from "@/lib/utils";
import type {
  CreateSubjectTaskActionState,
  ManagerSubjectTaskRow,
  UpdateSubjectTaskActionState,
} from "@/types/manager-subject-task";

const DEFAULT_PERIOD_DAYS = 7;
const DEFAULT_MAX_GRADE = 100;

type SubjectTaskFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectId: string;
  subjectName: string;
  /** When set, the dialog edits this task; otherwise it creates a new one. */
  task?: ManagerSubjectTaskRow | null;
  /** Sort order assigned to new tasks (append to end). */
  nextSortOrder: number;
  onSaved: (task: ManagerSubjectTaskRow) => void;
};

function getDefaultValues(
  task: ManagerSubjectTaskRow | null | undefined,
  nextSortOrder: number
) {
  return {
    title: task?.title ?? "",
    description: task?.description ?? "",
    period: task?.period ?? DEFAULT_PERIOD_DAYS,
    max_grade: task ? (task.max_grade ?? "") : DEFAULT_MAX_GRADE,
    is_yes_no: task?.is_yes_no ?? false,
    sort_order: task?.sort_order ?? nextSortOrder,
  };
}

export function SubjectTaskFormDialog({
  open,
  onOpenChange,
  subjectId,
  subjectName,
  task = null,
  nextSortOrder,
  onSaved,
}: SubjectTaskFormDialogProps) {
  const isEdit = Boolean(task);
  const [isTransitionPending, startTransition] = useTransition();
  const [createState, createAction, isCreatePending] = useActionState(
    createSubjectTaskAction,
    {} as CreateSubjectTaskActionState
  );
  const [updateState, updateAction, isUpdatePending] = useActionState(
    updateSubjectTaskAction,
    {} as UpdateSubjectTaskActionState
  );
  const state = isEdit ? updateState : createState;
  const isPending =
    isTransitionPending || (isEdit ? isUpdatePending : isCreatePending);
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
    schema: subjectTaskFieldsSchema,
    mode: "onBlur",
    defaultValues: getDefaultValues(task, nextSortOrder),
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

    reset(getDefaultValues(task, nextSortOrder));
    resetYesNoToggle();
  }, [open, task, nextSortOrder, reset, resetYesNoToggle]);

  useActionStateSuccess(
    state,
    isPending,
    (nextState) => {
      if (!nextState.task) {
        return;
      }

      onSaved(nextState.task);
      onOpenChange(false);
    },
    (nextState) => Boolean(nextState.success && nextState.task)
  );

  function onSubmit(values: {
    title: string;
    description?: string;
    period: number;
    max_grade?: "" | number;
    is_yes_no?: boolean;
    sort_order: number;
  }) {
    const formData = new FormData();
    formData.set("subject_id", subjectId);
    if (task) {
      formData.set("id", task.id);
    }
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
      if (task) {
        updateAction(formData);
      } else {
        createAction(formData);
      }
    });
  }

  const titleError = errors.title?.message ?? state.fieldErrors?.title?.[0];
  const periodError = errors.period?.message ?? state.fieldErrors?.period?.[0];
  const descriptionError =
    errors.description?.message ?? state.fieldErrors?.description?.[0];
  const maxGradeError =
    errors.max_grade?.message ?? state.fieldErrors?.max_grade?.[0];
  const formId = isEdit ? "edit-subject-task-form" : "add-subject-task-form";
  const idPrefix = isEdit ? "edit-subject-task" : "add-subject-task";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit subject task" : "Create subject task"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? `Update this task template for ${subjectName}. Existing class tasks are not changed.`
              : `Add a task template to ${subjectName}. It is copied onto classes that clone or import subject tasks.`}
          </DialogDescription>
        </DialogHeader>

        <form
          id={formId}
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor={`${idPrefix}-title`}
              label="Title"
              hint="Required"
            />
            <Input
              id={`${idPrefix}-title`}
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
              htmlFor={`${idPrefix}-description`}
              label="Description"
              hint="Optional"
            />
            <textarea
              id={`${idPrefix}-description`}
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
            id={`${idPrefix}-yes-no`}
            checked={isYesNo}
            onCheckedChange={onYesNoChange}
            disabled={isPending}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor={`${idPrefix}-period`}
                label="Period (days)"
                hint="Required"
              />
              <Input
                id={`${idPrefix}-period`}
                type="number"
                min={1}
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
                  htmlFor={`${idPrefix}-max-grade`}
                  label="Max grade"
                  hint="Optional"
                />
                <Input
                  id={`${idPrefix}-max-grade`}
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
          <Button type="submit" form={formId} disabled={isPending}>
            {isPending ? <InlineSpinner className="mr-2" /> : null}
            {isEdit ? "Save changes" : "Create task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
