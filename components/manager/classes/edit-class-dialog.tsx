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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MANAGER_PHASES_MOCK } from "@/lib/constants/manager-phases-mock";
import { MANAGER_SUBJECTS_MOCK } from "@/lib/constants/manager-subjects-mock";
import { CLASS_STATUSES } from "@/lib/constants/manager-class-status";
import { MANAGER_CLASS_STATUS_LABELS } from "@/lib/constants/manager-class-display";
import { showSuccessToast } from "@/lib/toast";
import {
  CLASS_STATUS_VALUES,
  updateClassSchema,
  type UpdateClassInput,
} from "@/lib/validators/manager/update-class";
import type { ManagerClassRow } from "@/types/manager-class-list";

const SEMESTER_UNLINKED = "unlinked";

type EditClassDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classRow: ManagerClassRow | null;
  onUpdateClass: (classRow: ManagerClassRow) => void;
};

export function EditClassDialog({
  open,
  onOpenChange,
  classRow,
  onUpdateClass,
}: EditClassDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UpdateClassInput>({
    resolver: zodResolver(updateClassSchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      subject_id: "",
      status: CLASS_STATUSES.SCHEDULED,
      semester_id: "",
    },
  });

  const selectedSubjectId = watch("subject_id");
  const selectedStatus = watch("status");
  const selectedSemesterId = watch("semester_id");

  useEffect(() => {
    if (!open || !classRow) {
      return;
    }

    reset({
      name: classRow.name,
      subject_id: classRow.subject_id,
      status: classRow.status as UpdateClassInput["status"],
      semester_id: classRow.semester_id ?? SEMESTER_UNLINKED,
    });
  }, [classRow, open, reset]);

  function onSubmit(values: UpdateClassInput) {
    if (!classRow) {
      return;
    }

    const subject = MANAGER_SUBJECTS_MOCK.find(
      (row) => row.id === values.subject_id
    );

    if (!subject) {
      return;
    }

    const semesterId =
      values.semester_id && values.semester_id !== SEMESTER_UNLINKED
        ? values.semester_id
        : null;
    const semester = semesterId
      ? MANAGER_PHASES_MOCK.find((row) => row.id === semesterId)
      : null;

    onUpdateClass({
      ...classRow,
      name: values.name.trim(),
      subject_id: subject.id,
      subject_name: subject.name,
      subject_nb_sessions: subject.nb_sessions,
      completed_sessions: Math.min(
        classRow.completed_sessions,
        subject.nb_sessions
      ),
      status: values.status,
      semester_id: semesterId,
      semester_name: semester?.name ?? null,
    });

    showSuccessToast("Class updated in the preview.");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit class</DialogTitle>
          <DialogDescription>
            Update class details for {classRow?.name ?? "this class"}.
            Preview-only until backend is connected.
          </DialogDescription>
        </DialogHeader>

        <form
          id="edit-class-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-class-name"
              label="Name"
              hint="Required"
            />
            <Input
              id="edit-class-name"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name ? (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-class-subject"
              label="Subject"
              hint="Required"
            />
            <Select
              value={selectedSubjectId || null}
              onValueChange={(value) => {
                if (!value) {
                  return;
                }

                setValue("subject_id", value, { shouldValidate: true });
              }}
            >
              <SelectTrigger
                id="edit-class-subject"
                className="w-full"
                aria-invalid={!!errors.subject_id}
              >
                <SelectValue placeholder="Select a subject" />
              </SelectTrigger>
              <SelectContent align="start">
                {MANAGER_SUBJECTS_MOCK.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.subject_id ? (
              <p className="text-sm text-destructive">
                {errors.subject_id.message}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-class-status"
              label="Status"
              hint="Required"
            />
            <Select
              value={selectedStatus || null}
              onValueChange={(value) => {
                if (!value) {
                  return;
                }

                setValue("status", value as UpdateClassInput["status"], {
                  shouldValidate: true,
                });
              }}
            >
              <SelectTrigger
                id="edit-class-status"
                className="w-full"
                aria-invalid={!!errors.status}
              >
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent align="start">
                {CLASS_STATUS_VALUES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {MANAGER_CLASS_STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.status ? (
              <p className="text-sm text-destructive">{errors.status.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-class-semester"
              label="Semester"
              hint="Optional"
            />
            <Select
              value={selectedSemesterId || SEMESTER_UNLINKED}
              onValueChange={(value) => {
                setValue("semester_id", value ?? SEMESTER_UNLINKED, {
                  shouldValidate: true,
                });
              }}
            >
              <SelectTrigger id="edit-class-semester" className="w-full">
                <SelectValue placeholder="No semester" />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value={SEMESTER_UNLINKED}>No semester</SelectItem>
                {MANAGER_PHASES_MOCK.map((semester) => (
                  <SelectItem key={semester.id} value={semester.id}>
                    {semester.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          <Button type="submit" form="edit-class-form" disabled={!classRow}>
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
