"use client";

import { useActionState, useEffect, useTransition } from "react";
import { addStudentToClassAction } from "@/app/manager/classes/actions";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { useZodForm } from "@/hooks/use-zod-form";
import {
  addStudentToClassSchema,
  type AddStudentToClassInput,
} from "@/lib/validators/manager/add-student-to-class";
import type { AddStudentToClassActionState } from "@/types/manager-class-detail";
import type { ManagerClassRow } from "@/types/manager-class-list";
import type { ManagerClassStudentRow } from "@/types/manager-class-student";
import type { ManagerStudentFinalExamGradeRow } from "@/types/manager-class-final-exam";
import type { ManagerStudentRow } from "@/types/manager-student";

const initialState: AddStudentToClassActionState = {};

type AddStudentToClassDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
  className: string;
  availableStudents: ManagerStudentRow[];
  onStudentAdded: (
    student: ManagerClassStudentRow,
    classRow: ManagerClassRow,
    studentGrade?: ManagerStudentFinalExamGradeRow
  ) => void;
};

export function AddStudentToClassDialog({
  open,
  onOpenChange,
  classId,
  className,
  availableStudents,
  onStudentAdded,
}: AddStudentToClassDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    addStudentToClassAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;

  useActionStateToast(state, isPending);

  const {
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useZodForm({
    schema: addStudentToClassSchema,
    mode: "onBlur",
    defaultValues: {
      studentProfileId: "",
    },
  });

  const selectedStudentProfileId = watch("studentProfileId");
  const hasAvailableStudents = availableStudents.length > 0;

  const studentSelectItems = availableStudents.map((student) => ({
    value: student.student_profile_id,
    label: `${student.full_name} · ${student.email}`,
  }));

  useEffect(() => {
    if (!open) {
      reset({ studentProfileId: "" });
    }
  }, [open, reset]);

  useActionStateSuccess(
    state,
    isPending,
    (nextState) => {
      if (!nextState.student || !nextState.classRow) {
        return;
      }

      onStudentAdded(nextState.student, nextState.classRow, nextState.studentGrade);
      onOpenChange(false);
    },
    (nextState) =>
      Boolean(nextState.success && nextState.student && nextState.classRow)
  );

  function onSubmit(values: AddStudentToClassInput) {
    const formData = new FormData();
    formData.set("class_id", classId);
    formData.set("studentProfileId", values.studentProfileId);

    startTransition(() => {
      formAction(formData);
    });
  }

  const studentError =
    errors.studentProfileId?.message ??
    state.fieldErrors?.studentProfileId?.[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add student to class</DialogTitle>
          <DialogDescription>
            Enroll a student in {className}.
          </DialogDescription>
        </DialogHeader>

        <form
          id="add-student-to-class-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="add-student-to-class-id"
              label="Student"
              hint="Required"
            />
            {hasAvailableStudents ? (
              <Select
                value={selectedStudentProfileId || null}
                items={studentSelectItems}
                onValueChange={(value) => {
                  if (!value) {
                    return;
                  }

                  setValue("studentProfileId", value, { shouldValidate: true });
                }}
                disabled={isPending}
              >
                <SelectTrigger
                  id="add-student-to-class-id"
                  className="w-full"
                  aria-invalid={!!studentError}
                >
                  <SelectValue placeholder="Select a student" />
                </SelectTrigger>
                <SelectContent align="start">
                  {availableStudents.map((student) => (
                    <SelectItem
                      key={student.student_profile_id}
                      value={student.student_profile_id}
                    >
                      {student.full_name} · {student.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground">
                Every available student is already enrolled in this class.
              </p>
            )}
            {studentError ? (
              <p className="text-sm text-destructive">{studentError}</p>
            ) : null}
          </div>
        </form>

        <DialogFooter className="mt-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="add-student-to-class-form"
            disabled={!hasAvailableStudents || isPending}
          >
            {isPending ? (
              <>
                <InlineSpinner className="mr-2" />
                Adding student
              </>
            ) : (
              "Add student"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
