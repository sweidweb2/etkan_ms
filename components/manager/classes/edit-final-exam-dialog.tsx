"use client";

import { useEffect, useTransition } from "react";
import { useFormActionState as useActionState } from "@/hooks/use-form-action-state";
import { updateFinalExamAction } from "@/app/manager/classes/actions";
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
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { Input } from "@/components/ui/input";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { useZodForm } from "@/hooks/use-zod-form";
import {
  updateFinalExamSchema,
  type UpdateFinalExamInput,
} from "@/lib/validators/manager/update-final-exam";
import { toSchoolDateTimeLocalValue } from "@/lib/utils/datetime-local-value";
import { cn } from "@/lib/utils";
import type { UpdateFinalExamActionState } from "@/types/manager-class-detail";
import type { ManagerClassFinalExamRow } from "@/types/manager-class-final-exam";

const initialState: UpdateFinalExamActionState = {};

type EditFinalExamDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  finalExam: ManagerClassFinalExamRow;
  className: string;
  onFinalExamUpdated: (exam: ManagerClassFinalExamRow) => void;
};

export function EditFinalExamDialog({
  open,
  onOpenChange,
  finalExam,
  className,
  onFinalExamUpdated,
}: EditFinalExamDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    updateFinalExamAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;

  const handleOpenChange = usePendingAwareOpenChange(isPending, onOpenChange);

  useActionStateToast(state, isPending);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useZodForm({
    schema: updateFinalExamSchema,
    mode: "onBlur",
    defaultValues: {
      title: finalExam.title,
      description: finalExam.description ?? "",
      due_date: toSchoolDateTimeLocalValue(finalExam.due_date),
      max_grade: finalExam.max_grade ?? "",
    },
  });

  const dueDate = watch("due_date");

  useEffect(() => {
    if (!open) {
      return;
    }

    reset({
      title: finalExam.title,
      description: finalExam.description ?? "",
      due_date: toSchoolDateTimeLocalValue(finalExam.due_date),
      max_grade: finalExam.max_grade ?? "",
    });
  }, [finalExam, open, reset]);

  useActionStateSuccess(
    state,
    isPending,
    (nextState) => {
      if (!nextState.finalExam) {
        return;
      }

      onFinalExamUpdated(nextState.finalExam);
      onOpenChange(false);
    },
    (nextState) => Boolean(nextState.success && nextState.finalExam)
  );

  function onSubmit(values: UpdateFinalExamInput) {
    const formData = new FormData();
    formData.set("id", finalExam.id);
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
          <DialogTitle>Edit final exam</DialogTitle>
          <DialogDescription>
            Update the final exam for {className}.
          </DialogDescription>
        </DialogHeader>

        <form
          id="edit-final-exam-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-final-exam-title"
              label="Title"
              hint="Required"
            />
            <Input
              id="edit-final-exam-title"
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
              htmlFor="edit-final-exam-description"
              label="Description"
              hint="Optional"
            />
            <textarea
              id="edit-final-exam-description"
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
                htmlFor="edit-final-exam-due-date"
                label="Due date"
                hint="Optional"
              />
              <DateTimePicker
                id="edit-final-exam-due-date"
                value={dueDate ?? ""}
                onChange={(next) =>
                  setValue("due_date", next, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                allowClear
                disabled={isPending}
              />
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="edit-final-exam-max-grade"
                label="Max grade"
                hint="Optional"
              />
              <Input
                id="edit-final-exam-max-grade"
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
          <Button type="submit" form="edit-final-exam-form" disabled={isPending}>
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
