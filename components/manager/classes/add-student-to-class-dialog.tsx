"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { MANAGER_STUDENTS_MOCK } from "@/lib/constants/manager-students-mock";
import { STUDENT_CLASS_STATUSES } from "@/lib/constants/manager-student-class-status";
import { showSuccessToast } from "@/lib/toast";
import {
  addStudentToClassSchema,
  type AddStudentToClassInput,
} from "@/lib/validators/manager/add-student-to-class";
import type { ManagerClassStudentRow } from "@/types/manager-class-student";

type AddStudentToClassDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className: string;
  enrolledStudentProfileIds: Set<string>;
  onAddStudent: (student: ManagerClassStudentRow) => void;
};

export function AddStudentToClassDialog({
  open,
  onOpenChange,
  className,
  enrolledStudentProfileIds,
  onAddStudent,
}: AddStudentToClassDialogProps) {
  const availableStudents = MANAGER_STUDENTS_MOCK.filter(
    (student) => !enrolledStudentProfileIds.has(student.student_profile_id)
  );

  const {
    handleSubmit,
    reset,
    setValue,
    watch,
    setError,
    formState: { errors },
  } = useForm<AddStudentToClassInput>({
    resolver: zodResolver(addStudentToClassSchema),
    mode: "onBlur",
    defaultValues: {
      studentProfileId: "",
    },
  });

  const selectedStudentProfileId = watch("studentProfileId");
  const hasAvailableStudents = availableStudents.length > 0;

  useEffect(() => {
    if (!open) {
      reset({ studentProfileId: "" });
    }
  }, [open, reset]);

  function onSubmit(values: AddStudentToClassInput) {
    const student = availableStudents.find(
      (row) => row.student_profile_id === values.studentProfileId
    );

    if (!student) {
      setError("studentProfileId", {
        message: "This student is no longer available.",
      });
      return;
    }

    onAddStudent({
      id: crypto.randomUUID(),
      student_profile_id: student.student_profile_id,
      user_id: student.user_id,
      full_name: student.full_name,
      username: student.username,
      email: student.email,
      phone: student.phone,
      enrollment_status: STUDENT_CLASS_STATUSES.IN_PROGRESS,
      joined_at: new Date().toISOString(),
    });

    showSuccessToast(`${student.full_name} added to ${className}.`);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add student to class</DialogTitle>
          <DialogDescription>
            Enroll a student in {className} via student_class. Preview-only
            until backend is connected.
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
              hint="Required · maps to student_class.user_id"
            />
            {hasAvailableStudents ? (
              <Select
                value={selectedStudentProfileId || null}
                onValueChange={(value) => {
                  if (!value) {
                    return;
                  }

                  setValue("studentProfileId", value, { shouldValidate: true });
                }}
              >
                <SelectTrigger
                  id="add-student-to-class-id"
                  className="w-full"
                  aria-invalid={!!errors.studentProfileId}
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
            {errors.studentProfileId ? (
              <p className="text-sm text-destructive">
                {errors.studentProfileId.message}
              </p>
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
            form="add-student-to-class-form"
            disabled={!hasAvailableStudents}
          >
            Add student
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
