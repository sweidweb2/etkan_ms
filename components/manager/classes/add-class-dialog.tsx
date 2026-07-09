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
import { showSuccessToast } from "@/lib/toast";
import {
  CLASS_STATUS_VALUES,
  createClassSchema,
  type CreateClassInput,
} from "@/lib/validators/manager/create-class";
import type { ManagerClassRow } from "@/types/manager-class-list";

const SEMESTER_UNLINKED = "unlinked";

type AddClassDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateClass: (classRow: ManagerClassRow) => void;
};

export function AddClassDialog({
  open,
  onOpenChange,
  onCreateClass,
}: AddClassDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateClassInput>({
    resolver: zodResolver(createClassSchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      subject_id: "",
      status: "active",
      semester_id: "",
    },
  });

  const selectedSubjectId = watch("subject_id");
  const selectedStatus = watch("status");
  const selectedSemesterId = watch("semester_id");

  useEffect(() => {
    if (!open) {
      reset({
        name: "",
        subject_id: "",
        status: "active",
        semester_id: "",
      });
    }
  }, [open, reset]);

  function onSubmit(values: CreateClassInput) {
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

    onCreateClass({
      id: crypto.randomUUID(),
      name: values.name.trim(),
      subject_id: subject.id,
      subject_name: subject.name,
      subject_nb_sessions: subject.nb_sessions,
      completed_sessions: 0,
      status: values.status,
      semester_id: semesterId,
      semester_name: semester?.name ?? null,
      enrollment_count: 0,
      teacher_count: 0,
      created_at: new Date().toISOString(),
    });

    showSuccessToast("Class added to the preview list.");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add class</DialogTitle>
          <DialogDescription>
            Create a class linked to a subject. Optionally assign it to a
            semester. Preview-only until backend is connected.
          </DialogDescription>
        </DialogHeader>

        <form
          id="add-class-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="add-class-name"
              label="Name"
              hint="Required"
            />
            <Input
              id="add-class-name"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name ? (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="add-class-subject"
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
                id="add-class-subject"
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
              htmlFor="add-class-status"
              label="Status"
              hint="Required"
            />
            <Select
              value={selectedStatus || null}
              onValueChange={(value) => {
                if (!value) {
                  return;
                }

                setValue("status", value as CreateClassInput["status"], {
                  shouldValidate: true,
                });
              }}
            >
              <SelectTrigger
                id="add-class-status"
                className="w-full"
                aria-invalid={!!errors.status}
              >
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent align="start">
                {CLASS_STATUS_VALUES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
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
              htmlFor="add-class-semester"
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
              <SelectTrigger id="add-class-semester" className="w-full">
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
          <Button type="submit" form="add-class-form">
            Create class
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
