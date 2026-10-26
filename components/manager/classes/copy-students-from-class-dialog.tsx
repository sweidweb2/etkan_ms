"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useFormActionState as useActionState } from "@/hooks/use-form-action-state";
import {
  copyStudentsFromClassAction,
  loadActiveStudentDiffFromClassAction,
  loadSameSemesterClassesForCopyAction,
} from "@/app/manager/classes/actions";
import { FieldLabel } from "@/components/auth/field-label";
import {
  OptionalEnrollPaymentPhasesDialog,
  type OptionalEnrollPaymentPhaseOption,
} from "@/components/manager/classes/optional-enroll-payment-phases-dialog";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { useZodForm } from "@/hooks/use-zod-form";
import {
  copyStudentsFromClassSchema,
  type CopyStudentsFromClassInput,
} from "@/lib/validators/manager/copy-students-from-class";
import type { AddStudentToClassActionState } from "@/types/manager-class-detail";
import type { ManagerClassRow } from "@/types/manager-class-list";
import type { ManagerClassStudentRow } from "@/types/manager-class-student";
import type { ManagerStudentFinalExamGradeRow } from "@/types/manager-class-final-exam";
import type { ManagerStudentRow } from "@/types/manager-student";

const initialState: AddStudentToClassActionState = {};

type ClassCopySourceOption = {
  id: string;
  name: string;
  status: string;
};

type OptionalEnrollFollowUp = {
  studentId: string;
  studentLabel: string;
  autoAssignedPhase: OptionalEnrollPaymentPhaseOption;
  optionalPaymentPhases: OptionalEnrollPaymentPhaseOption[];
};

type CopyStudentsFromClassDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
  className: string;
  onStudentsAdded: (
    students: ManagerClassStudentRow[],
    classRow: ManagerClassRow,
    studentGrades: ManagerStudentFinalExamGradeRow[]
  ) => void;
};

export function CopyStudentsFromClassDialog({
  open,
  onOpenChange,
  classId,
  className,
  onStudentsAdded,
}: CopyStudentsFromClassDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    copyStudentsFromClassAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;

  const [classOptions, setClassOptions] = useState<ClassCopySourceOption[] | null>(
    null
  );
  const [sourceClassId, setSourceClassId] = useState("");
  const [diffStudents, setDiffStudents] = useState<ManagerStudentRow[] | null>(
    null
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoadingDiff, setIsLoadingDiff] = useState(false);
  const [optionalFollowUp, setOptionalFollowUp] =
    useState<OptionalEnrollFollowUp | null>(null);
  const diffRequestIdRef = useRef(0);

  const isLoadingOptions = open && classOptions === null;
  const selectedCount = selectedIds.length;
  const hasDiff = (diffStudents?.length ?? 0) > 0;

  const {
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useZodForm({
    schema: copyStudentsFromClassSchema,
    mode: "onBlur",
    defaultValues: {
      source_class_id: "",
      studentProfileIds: [] as string[],
    },
  });

  const handleOpenChange = usePendingAwareOpenChange(isPending, (nextOpen) => {
    if (!nextOpen) {
      diffRequestIdRef.current += 1;
      setClassOptions(null);
      setSourceClassId("");
      setDiffStudents(null);
      setSelectedIds([]);
      setIsLoadingDiff(false);
      reset({ source_class_id: "", studentProfileIds: [] });
    }
    onOpenChange(nextOpen);
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;
    void loadSameSemesterClassesForCopyAction(classId).then((rows) => {
      if (!cancelled) {
        setClassOptions(rows);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [open, classId]);

  useActionStateToast(state, isPending);

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

  function handleSourceChange(nextId: string | null) {
    if (!nextId) {
      return;
    }

    setSourceClassId(nextId);
    setValue("source_class_id", nextId, { shouldValidate: true });
    setDiffStudents(null);
    setSelectedIds([]);
    setValue("studentProfileIds", [], { shouldValidate: false });
    setIsLoadingDiff(true);

    const requestId = ++diffRequestIdRef.current;
    void loadActiveStudentDiffFromClassAction(classId, nextId).then((rows) => {
      if (requestId !== diffRequestIdRef.current) {
        return;
      }
      setDiffStudents(rows);
      const ids = rows.map((row) => row.student_profile_id);
      setSelectedIds(ids);
      setValue("studentProfileIds", ids, { shouldValidate: true });
      setIsLoadingDiff(false);
    });
  }

  function toggleStudent(studentProfileId: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = checked
        ? current.includes(studentProfileId)
          ? current
          : [...current, studentProfileId]
        : current.filter((id) => id !== studentProfileId);
      setValue("studentProfileIds", next, { shouldValidate: true });
      return next;
    });
  }

  function onSubmit(values: CopyStudentsFromClassInput) {
    const formData = new FormData();
    formData.set("class_id", classId);
    formData.set("source_class_id", values.source_class_id);
    for (const id of values.studentProfileIds) {
      formData.append("studentProfileIds", id);
    }

    startTransition(() => {
      formAction(formData);
    });
  }

  const sourceError =
    errors.source_class_id?.message ?? state.fieldErrors?.source_class_id?.[0];
  const studentError =
    errors.studentProfileIds?.message ??
    state.fieldErrors?.studentProfileIds?.[0];

  const sourceOptions = classOptions ?? [];

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg" showCloseButton={!isPending}>
          <DialogHeader>
            <DialogTitle>Copy students from class</DialogTitle>
            <DialogDescription>
              Copy active students from another class in the same semester into{" "}
              {className}. Students already in this class are skipped.
            </DialogDescription>
          </DialogHeader>

          <form
            id="copy-students-from-class-form"
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
            noValidate
          >
            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="copy-students-source-class"
                label="Source class"
                hint="Required"
              />
              {isLoadingOptions ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <InlineSpinner />
                  Loading classes…
                </div>
              ) : sourceOptions.length === 0 ? (
                <p className="rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground">
                  No other classes are linked to this semester.
                </p>
              ) : (
                <Select
                  value={sourceClassId}
                  onValueChange={handleSourceChange}
                  disabled={isPending}
                >
                  <SelectTrigger
                    id="copy-students-source-class"
                    className="w-full"
                    aria-invalid={!!sourceError}
                  >
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {sourceOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {sourceError ? (
                <p className="text-sm text-destructive">{sourceError}</p>
              ) : null}
            </div>

            {sourceClassId ? (
              <div className="flex flex-col gap-2">
                <FieldLabel
                  htmlFor="copy-students-checklist"
                  label="Students to copy"
                  hint="Required"
                />
                {isLoadingDiff || diffStudents === null ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <InlineSpinner />
                    Comparing rosters…
                  </div>
                ) : hasDiff ? (
                  <div
                    id="copy-students-checklist"
                    className="max-h-56 space-y-2 overflow-y-auto rounded-lg border p-3"
                  >
                    {diffStudents.map((student) => {
                      const checked = selectedIds.includes(
                        student.student_profile_id
                      );
                      return (
                        <label
                          key={student.student_profile_id}
                          className="flex cursor-pointer items-start gap-3 text-sm"
                        >
                          <Checkbox
                            checked={checked}
                            disabled={isPending}
                            onCheckedChange={(next) =>
                              toggleStudent(
                                student.student_profile_id,
                                next === true
                              )
                            }
                          />
                          <span className="min-w-0">
                            <span className="block truncate font-medium">
                              {student.full_name}
                            </span>
                            <span className="block truncate text-muted-foreground">
                              {student.email || student.username || "—"}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground">
                    No active students to copy from this class.
                  </p>
                )}
                {studentError ? (
                  <p className="text-sm text-destructive">{studentError}</p>
                ) : null}
              </div>
            ) : null}
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
              form="copy-students-from-class-form"
              disabled={
                isPending ||
                isLoadingOptions ||
                isLoadingDiff ||
                !sourceClassId ||
                !hasDiff ||
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
