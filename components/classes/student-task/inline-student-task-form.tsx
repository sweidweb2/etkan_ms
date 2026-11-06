"use client";

import { useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import { updateStudentTaskAction } from "@/app/manager/classes/actions";
import { Can } from "@/components/auth/can";
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
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { useFormActionState } from "@/hooks/use-form-action-state";
import { useZodForm } from "@/hooks/use-zod-form";
import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  createEditStudentTaskSchema,
  type EditStudentTaskInput,
} from "@/lib/validators/manager/edit-student-task";
import type {
  ManagerStudentTaskRow,
  UpdateStudentTaskActionState,
} from "@/types/manager-class-session-detail";

const initialUpdateState: UpdateStudentTaskActionState = {};

type InlineStudentTaskFormProps = {
  studentTask: ManagerStudentTaskRow;
  maxGrade: number | null;
  isYesNo?: boolean;
  dueDate: string | null;
  readOnly: boolean;
  onUpdateStudentTask: (studentTask: ManagerStudentTaskRow) => void;
};

export function InlineStudentTaskForm({
  studentTask,
  maxGrade,
  isYesNo = false,
  dueDate,
  readOnly,
  onUpdateStudentTask,
}: InlineStudentTaskFormProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useFormActionState(
    updateStudentTaskAction,
    initialUpdateState
  );
  const isPending = isActionPending || isTransitionPending;
  const isFormDisabled = isPending || readOnly;
  const [gradedAtPreview, setGradedAtPreview] = useState(() =>
    toDatetimeLocalValue(new Date())
  );

  const schema = useMemo(
    () => createEditStudentTaskSchema(maxGrade, dueDate, { isYesNo }),
    [dueDate, isYesNo, maxGrade]
  );

  useActionStateToast(state, isPending);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useZodForm({
    schema,
    mode: "onBlur",
    defaultValues: getStudentTaskFormDefaults(studentTask),
  });

  useActionStateSuccess(
    state,
    isPending,
    (nextState) => {
      if (!nextState.studentTask) {
        return;
      }
      onUpdateStudentTask(nextState.studentTask);
      setGradedAtPreview(toDatetimeLocalValue(new Date()));
    },
    (nextState) => Boolean(nextState.success && nextState.studentTask)
  );

  function onSubmit(values: EditStudentTaskInput) {
    if (readOnly) {
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

  const gradedAtDisplay = studentTask.graded_at
    ? format(new Date(studentTask.graded_at), "MMM d, yyyy 'at' h:mm a")
    : formatGradedAtDisplay(gradedAtPreview);

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      noValidate
    >
      {readOnly ? (
        <p className="rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/30 dark:text-amber-100">
          Cannot change this student&apos;s grade inputs while a computed course
          grade exists. Delete the computed grade first.
        </p>
      ) : null}

      <StudentTaskFields
        idPrefix={`student-task-${studentTask.id}`}
        maxGrade={maxGrade}
        isYesNo={isYesNo}
        disabled={isFormDisabled}
        register={register as never}
        setValue={setValue as never}
        watch={watch as never}
        errors={errors as never}
        fieldErrors={state.fieldErrors}
        gradedAtDisplay={gradedAtDisplay}
        layout="grid"
        notesRows={3}
        reportRows={4}
      />

      {readOnly ? null : (
        <div className="flex justify-end">
          <Can permission={PERMISSIONS.TASKS_UPDATE_STUDENT}>
            <Button type="submit" disabled={isPending}>
              {isPending ? <InlineSpinner /> : null}
              Save student task
            </Button>
          </Can>
        </div>
      )}
    </form>
  );
}
