"use client";

import { useEffect, useTransition } from "react";
import { useFormActionState as useActionState } from "@/hooks/use-form-action-state";
import { createFinalExamAction } from "@/app/manager/classes/actions";
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
  createFinalExamSchema,
  type CreateFinalExamInput,
} from "@/lib/validators/manager/create-final-exam";
import { cn } from "@/lib/utils";
import type { CreateFinalExamActionState } from "@/types/manager-class-detail";
import type {
  ManagerClassFinalExamRow,
  ManagerStudentFinalExamGradeRow,
} from "@/types/manager-class-final-exam";

const initialState: CreateFinalExamActionState = {};

type CreateFinalExamDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
  className: string;
  onFinalExamCreated: (
    exam: ManagerClassFinalExamRow,
    grades: ManagerStudentFinalExamGradeRow[]
  ) => void;
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
  onFinalExamCreated,
}: CreateFinalExamDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    createFinalExamAction,
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
    schema: createFinalExamSchema,
    mode: "onBlur",
    defaultValues: {
      title: "Final exam",
      description: "",
      due_date: "",
      max_grade: 100,
    },
  });

  useEffect(() => {
    if (!open) {
      reset({
        title: "Final exam",
        description: "",
        due_date: "",
        max_grade: 100,
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
      max_grade: 100,
    });
  }, [open, reset]);

  useActionStateSuccess(
    state,
    isPending,
    (nextState) => {
      if (!nextState.finalExam) {
        return;
      }

      onFinalExamCreated(nextState.finalExam, nextState.studentGrades ?? []);
      onOpenChange(false);
    },
    (nextState) => Boolean(nextState.success && nextState.finalExam)
  );

  function onSubmit(values: CreateFinalExamInput) {
    const formData = new FormData();
    formData.set("class_id", classId);
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
          <DialogTitle>Create final exam</DialogTitle>
          <DialogDescription>
            One final exam per class for {className}.
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
              htmlFor="create-final-exam-description"
              label="Description"
              hint="Optional"
            />
            <textarea
              id="create-final-exam-description"
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
                htmlFor="create-final-exam-due-date"
                label="Due date"
                hint="Optional"
              />
              <Input
                id="create-final-exam-due-date"
                type="datetime-local"
                disabled={isPending}
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
            form="create-final-exam-form"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <InlineSpinner className="mr-2" />
                Creating final exam
              </>
            ) : (
              "Create final exam"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
