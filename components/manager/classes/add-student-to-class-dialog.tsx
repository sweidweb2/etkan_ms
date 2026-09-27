"use client";

import { useEffect, useState, useTransition } from "react";
import { useFormActionState as useActionState } from "@/hooks/use-form-action-state";
import {
  addStudentToClassAction,
  loadAvailableStudentsForClassAction,
} from "@/app/manager/classes/actions";
import { FieldLabel } from "@/components/auth/field-label";
import {
  OptionalEnrollPaymentPhasesDialog,
  type OptionalEnrollPaymentPhaseOption,
} from "@/components/manager/classes/optional-enroll-payment-phases-dialog";
import { StudentMultiSelectField } from "@/components/manager/classes/student-multi-select-field";
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
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { useZodForm } from "@/hooks/use-zod-form";
import {
  addStudentsToClassSchema,
  type AddStudentsToClassInput,
} from "@/lib/validators/manager/add-student-to-class";
import type { AddStudentToClassActionState } from "@/types/manager-class-detail";
import type { ManagerClassRow } from "@/types/manager-class-list";
import type { ManagerClassStudentRow } from "@/types/manager-class-student";
import type { ManagerStudentFinalExamGradeRow } from "@/types/manager-class-final-exam";
import type { ManagerStudentRow } from "@/types/manager-student";

const initialState: AddStudentToClassActionState = {};

type OptionalEnrollFollowUp = {
  studentId: string;
  studentLabel: string;
  autoAssignedPhase: OptionalEnrollPaymentPhaseOption;
  optionalPaymentPhases: OptionalEnrollPaymentPhaseOption[];
};

type AddStudentToClassDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
  className: string;
  availableStudents: ManagerStudentRow[];
  onStudentsAdded: (
    students: ManagerClassStudentRow[],
    classRow: ManagerClassRow,
    studentGrades: ManagerStudentFinalExamGradeRow[]
  ) => void;
};

export function AddStudentToClassDialog({
  open,
  onOpenChange,
  classId,
  className,
  availableStudents: availableStudentsProp,
  onStudentsAdded,
}: AddStudentToClassDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    addStudentToClassAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;
  const [selectedStudents, setSelectedStudents] = useState<ManagerStudentRow[]>(
    []
  );
  const [fetchedStudents, setFetchedStudents] = useState<
    ManagerStudentRow[] | null
  >(null);
  const [optionalFollowUp, setOptionalFollowUp] =
    useState<OptionalEnrollFollowUp | null>(null);

  const needsFetch = availableStudentsProp.length === 0;
  const availableStudents = needsFetch
    ? (fetchedStudents ?? [])
    : availableStudentsProp;
  const isLoadingOptions = open && needsFetch && fetchedStudents === null;

  const {
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useZodForm({
    schema: addStudentsToClassSchema,
    mode: "onBlur",
    defaultValues: {
      studentProfileIds: [] as string[],
    },
  });

  const handleOpenChange = usePendingAwareOpenChange(isPending, (nextOpen) => {
    if (!nextOpen) {
      setSelectedStudents([]);
      setFetchedStudents(null);
      reset({ studentProfileIds: [] });
    }
    onOpenChange(nextOpen);
  });

  useEffect(() => {
    if (!open || !needsFetch) {
      return;
    }

    let cancelled = false;
    void loadAvailableStudentsForClassAction(classId).then((rows) => {
      if (!cancelled) {
        setFetchedStudents(rows);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [open, classId, needsFetch]);

  useActionStateToast(state, isPending);

  const hasAvailableStudents = availableStudents.length > 0;
  const selectedCount = selectedStudents.length;

  useActionStateSuccess(
    state,
    isPending,
    (nextState) => {
      const added =
        nextState.students ?? (nextState.student ? [nextState.student] : []);
      if (!nextState.classRow || added.length === 0) {
        return;
      }

      onStudentsAdded(
        added,
        nextState.classRow,
        nextState.studentGrades ??
          (nextState.studentGrade ? [nextState.studentGrade] : [])
      );
      onOpenChange(false);

      if (
        added.length === 1 &&
        nextState.autoAssignedPhase &&
        nextState.optionalPaymentPhases &&
        nextState.optionalPaymentPhases.length > 0
      ) {
        setOptionalFollowUp({
          studentId: added[0].user_id,
          studentLabel: added[0].full_name,
          autoAssignedPhase: nextState.autoAssignedPhase,
          optionalPaymentPhases: nextState.optionalPaymentPhases,
        });
      }
    },
    (nextState) =>
      Boolean(
        nextState.success &&
          nextState.classRow &&
          ((nextState.students && nextState.students.length > 0) ||
            nextState.student)
      )
  );

  function handleSelectionChange(next: ManagerStudentRow[]) {
    setSelectedStudents(next);
    setValue(
      "studentProfileIds",
      next.map((student) => student.student_profile_id),
      { shouldValidate: true }
    );
  }

  function onSubmit(values: AddStudentsToClassInput) {
    const formData = new FormData();
    formData.set("class_id", classId);
    for (const id of values.studentProfileIds) {
      formData.append("studentProfileIds", id);
    }

    startTransition(() => {
      formAction(formData);
    });
  }

  const studentError =
    errors.studentProfileIds?.message ??
    state.fieldErrors?.studentProfileIds?.[0] ??
    state.fieldErrors?.studentProfileId?.[0];

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg" showCloseButton={!isPending}>
          <DialogHeader>
            <DialogTitle>Add students to class</DialogTitle>
            <DialogDescription>
              Enroll one or more students in {className}.
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
                label="Students"
                hint="Required"
              />
              {isLoadingOptions ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <InlineSpinner />
                  Loading students…
                </div>
              ) : hasAvailableStudents ? (
                <StudentMultiSelectField
                  inputId="add-student-to-class-id"
                  students={availableStudents}
                  selected={selectedStudents}
                  onChange={handleSelectionChange}
                  disabled={isPending}
                  invalid={!!studentError}
                />
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
              disabled={isPending}
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="add-student-to-class-form"
              disabled={
                isPending ||
                isLoadingOptions ||
                !hasAvailableStudents ||
                selectedCount === 0
              }
            >
              {isPending ? (
                <>
                  <InlineSpinner className="mr-2" />
                  {selectedCount > 1 ? "Adding students" : "Adding student"}
                </>
              ) : selectedCount > 1 ? (
                `Add ${selectedCount} students`
              ) : (
                "Add student"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <OptionalEnrollPaymentPhasesDialog
        open={optionalFollowUp !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setOptionalFollowUp(null);
          }
        }}
        studentId={optionalFollowUp?.studentId ?? ""}
        studentLabel={optionalFollowUp?.studentLabel ?? ""}
        autoAssignedPhase={
          optionalFollowUp?.autoAssignedPhase ?? { id: "", name: "" }
        }
        optionalPaymentPhases={optionalFollowUp?.optionalPaymentPhases ?? []}
      />
    </>
  );
}
