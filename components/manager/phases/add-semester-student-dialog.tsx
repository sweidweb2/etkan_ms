"use client";

import { useActionState, useEffect, useTransition } from "react";
import { addStudentToSemesterAction } from "@/app/manager/semesters/actions";
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
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { useZodForm } from "@/hooks/use-zod-form";
import { MANAGER_STUDENT_SEMESTER_STATUS_LABELS } from "@/lib/constants/manager-student-semester-display";
import { STUDENT_SEMESTER_STATUSES } from "@/lib/constants/manager-student-semester-status";
import {
  addStudentToSemesterSchema,
  type AddStudentToSemesterInput,
} from "@/lib/validators/manager/add-student-to-semester";
import type { AddStudentToSemesterActionState } from "@/types/manager-phase";
import type { ManagerStudentRow } from "@/types/manager-student";

const initialState: AddStudentToSemesterActionState = {};

type AddSemesterStudentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  semesterId: string;
  semesterName: string;
  availableStudents: ManagerStudentRow[];
  onStudentAdded: () => void;
};

export function AddSemesterStudentDialog({
  open,
  onOpenChange,
  semesterId,
  semesterName,
  availableStudents,
  onStudentAdded,
}: AddSemesterStudentDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    addStudentToSemesterAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;

  const handleOpenChange = usePendingAwareOpenChange(isPending, onOpenChange);

  useActionStateToast(state, isPending);

  const {
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useZodForm({
    schema: addStudentToSemesterSchema,
    mode: "onBlur",
    defaultValues: {
      student_profile_id: "",
      status: STUDENT_SEMESTER_STATUSES.PENDING,
    },
  });

  const selectedStudentId = watch("student_profile_id");
  const selectedStatus = watch("status");
  const hasAvailableStudents = availableStudents.length > 0;

  useEffect(() => {
    if (!open) {
      reset({
        student_profile_id: "",
        status: STUDENT_SEMESTER_STATUSES.PENDING,
      });
    }
  }, [open, reset]);

  useActionStateSuccess(state, isPending, () => {
    onOpenChange(false);
    onStudentAdded();
  });

  function onSubmit(values: AddStudentToSemesterInput) {
    const formData = new FormData();
    formData.set("semester_id", semesterId);
    formData.set("student_profile_id", values.student_profile_id);
    formData.set("status", values.status);

    startTransition(() => {
      formAction(formData);
    });
  }

  const studentError =
    errors.student_profile_id?.message ?? state.fieldErrors?.student_profile_id?.[0];
  const statusError = errors.status?.message ?? state.fieldErrors?.status?.[0];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Add student to semester</DialogTitle>
          <DialogDescription>
            Enroll a student in {semesterName}.
          </DialogDescription>
        </DialogHeader>

        <form
          id="add-semester-student-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="add-semester-student-id"
              label="Student"
              hint="Required"
            />
            {hasAvailableStudents ? (
              <Select
                value={selectedStudentId || null}
                onValueChange={(value) => {
                  if (!value) {
                    return;
                  }

                  setValue("student_profile_id", value, { shouldValidate: true });
                }}
                disabled={isPending}
              >
                <SelectTrigger
                  id="add-semester-student-id"
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
              <p className="text-sm text-muted-foreground">
                All students are already enrolled in this semester.
              </p>
            )}
            {studentError ? (
              <p className="text-sm text-destructive">{studentError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="add-semester-student-status"
              label="Enrollment status"
              hint="Required"
            />
            <Select
              value={selectedStatus || null}
              onValueChange={(value) => {
                if (!value) {
                  return;
                }

                setValue("status", value as AddStudentToSemesterInput["status"], {
                  shouldValidate: true,
                });
              }}
              disabled={isPending}
            >
              <SelectTrigger
                id="add-semester-student-status"
                className="w-full"
                aria-invalid={!!statusError}
              >
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent align="start">
                {Object.entries(MANAGER_STUDENT_SEMESTER_STATUS_LABELS).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
            {statusError ? (
              <p className="text-sm text-destructive">{statusError}</p>
            ) : null}
          </div>
        </form>

        <DialogFooter className="mt-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={isPending} onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="add-semester-student-form"
            disabled={!hasAvailableStudents || isPending}
          >
            {isPending ? <InlineSpinner /> : "Add student"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
