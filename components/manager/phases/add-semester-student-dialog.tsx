"use client";

import { useEffect } from "react";
import { useZodForm } from "@/hooks/use-zod-form";
import { FieldLabel } from "@/components/auth/field-label";
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
import { MANAGER_STUDENT_SEMESTER_STATUS_LABELS } from "@/lib/constants/manager-student-semester-display";
import { STUDENT_SEMESTER_STATUSES } from "@/lib/constants/manager-student-semester-status";
import { showSuccessToast } from "@/lib/toast";
import {
  addStudentToSemesterSchema,
  type AddStudentToSemesterInput,
} from "@/lib/validators/manager/add-student-to-semester";
import type { ManagerStudentRow } from "@/types/manager-student";
import type { ManagerStudentSemesterRow } from "@/types/manager-student-semester";

type AddSemesterStudentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  semesterId: string;
  semesterName: string;
  availableStudents: ManagerStudentRow[];
  onAddStudent: (row: ManagerStudentSemesterRow) => void;
};

export function AddSemesterStudentDialog({
  open,
  onOpenChange,
  semesterId,
  semesterName,
  availableStudents,
  onAddStudent,
}: AddSemesterStudentDialogProps) {
  const {
    handleSubmit,
    reset,
    setValue,
    watch,
    setError,
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

  function onSubmit(values: AddStudentToSemesterInput) {
    const student = availableStudents.find(
      (row) => row.student_profile_id === values.student_profile_id
    );

    if (!student) {
      setError("student_profile_id", {
        message: "This student is no longer available.",
      });
      return;
    }

    onAddStudent({
      id: `ss-${student.student_profile_id}-${semesterId}`,
      student_profile_id: student.student_profile_id,
      user_id: student.user_id,
      full_name: student.full_name,
      email: student.email,
      phone: student.phone,
      semester_id: semesterId,
      semester_name: semesterName,
      status: values.status,
      created_at: new Date().toISOString(),
    });
    showSuccessToast(`${student.full_name} added to ${semesterName}.`);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add student to semester</DialogTitle>
          <DialogDescription>
            Enroll a student in {semesterName}. Preview-only until backend is
            connected.
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
              >
                <SelectTrigger
                  id="add-semester-student-id"
                  className="w-full"
                  aria-invalid={!!errors.student_profile_id}
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
                All students are already enrolled in this semester preview.
              </p>
            )}
            {errors.student_profile_id ? (
              <p className="text-sm text-destructive">
                {errors.student_profile_id.message}
              </p>
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
            >
              <SelectTrigger
                id="add-semester-student-status"
                className="w-full"
                aria-invalid={!!errors.status}
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
            {errors.status ? (
              <p className="text-sm text-destructive">{errors.status.message}</p>
            ) : null}
          </div>
        </form>

        <DialogFooter className="mt-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="add-semester-student-form"
            disabled={!hasAvailableStudents}
          >
            Add student
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
