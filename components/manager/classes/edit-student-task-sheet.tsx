"use client";

import { useMemo, useState, useTransition } from "react";
import { useFormActionState as useActionState } from "@/hooks/use-form-action-state";
import { updateStudentTaskAction } from "@/app/manager/classes/actions";
import {
  formatGradedAtDisplay,
  StudentTaskFields,
} from "@/components/classes/student-task/student-task-fields";
import {
  buildStudentTaskUpdateFormData,
  getStudentTaskFormDefaults,
  toDatetimeLocalValue,
} from "@/components/classes/student-task/student-task-form-utils";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { useZodForm } from "@/hooks/use-zod-form";
import {
  createEditStudentTaskSchema,
  type EditStudentTaskInput,
} from "@/lib/validators/manager/edit-student-task";
import type {
  ManagerStudentTaskRow,
  UpdateStudentTaskActionState,
} from "@/types/manager-class-session-detail";

const initialState: UpdateStudentTaskActionState = {};

type EditStudentTaskSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentTask: ManagerStudentTaskRow | null;
  maxGrade: number | null;
  dueDate?: string | null;
  readOnly?: boolean;
  onUpdateStudentTask: (studentTask: ManagerStudentTaskRow) => void;
};

export function EditStudentTaskSheet({
  open,
  onOpenChange,
  studentTask,
  maxGrade,
  dueDate = null,
  readOnly = false,
  onUpdateStudentTask,
}: EditStudentTaskSheetProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    updateStudentTaskAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;
  const isFormDisabled = isPending || readOnly;
  const [gradedAtPreview, setGradedAtPreview] = useState(() =>
    toDatetimeLocalValue(new Date())
  );

  const schema = useMemo(
    () => createEditStudentTaskSchema(maxGrade, dueDate),
    [dueDate, maxGrade]
  );

  useActionStateToast(state, isPending);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useZodForm({
    schema,
    mode: "onBlur",
    defaultValues: studentTask
      ? getStudentTaskFormDefaults(studentTask)
      : {
          status: "pending",
          grade: "",
          notes: "",
          student_report: "",
          submitted_at: "",
        },
  });

  const pendingAwareOpenChange = usePendingAwareOpenChange(
    isPending,
    onOpenChange
  );

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen && studentTask) {
      setGradedAtPreview(toDatetimeLocalValue(new Date()));
      reset(getStudentTaskFormDefaults(studentTask));
    }

    pendingAwareOpenChange(nextOpen);
  }

  useActionStateSuccess(
    state,
    isPending,
    (nextState) => {
      if (!nextState.studentTask) {
        return;
      }

      onUpdateStudentTask(nextState.studentTask);
      onOpenChange(false);
    },
    (nextState) => Boolean(nextState.success && nextState.studentTask)
  );

  if (!studentTask) {
    return null;
  }

  function onSubmit(values: EditStudentTaskInput) {
    if (!studentTask || readOnly) {
      return;
    }

    const formData = buildStudentTaskUpdateFormData(
      studentTask.id,
      values,
      dueDate
    );

    startTransition(() => {
      formAction(formData);
    });
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md"
        showCloseButton={!isPending}
      >
        <SheetHeader>
          <SheetTitle>{studentTask.full_name}</SheetTitle>
          <SheetDescription>
            {readOnly
              ? "View-only while a computed course grade exists for this student. Delete the computed grade to edit."
              : "Edit student_tasks fields for this assignment."}
          </SheetDescription>
        </SheetHeader>

        {readOnly ? (
          <p className="mx-4 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/30 dark:text-amber-100">
            Cannot change this student&apos;s grade inputs while a computed
            course grade exists. Delete the computed grade first.
          </p>
        ) : null}

        <form
          id="edit-student-task-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-1 flex-col gap-4 overflow-y-auto px-4"
          noValidate
        >
          <StudentTaskFields
            idPrefix="edit-student-task"
            maxGrade={maxGrade}
            disabled={isFormDisabled}
            register={register as never}
            setValue={setValue as never}
            watch={watch as never}
            errors={errors as never}
            fieldErrors={state.fieldErrors}
            gradedAtDisplay={formatGradedAtDisplay(gradedAtPreview)}
            layout="stack"
          />
        </form>

        <SheetFooter className="mt-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => handleOpenChange(false)}
          >
            {readOnly ? "Close" : "Cancel"}
          </Button>
          {readOnly ? null : (
            <Button
              type="submit"
              form="edit-student-task-form"
              disabled={isPending}
            >
              {isPending ? <InlineSpinner /> : null}
              Save changes
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
