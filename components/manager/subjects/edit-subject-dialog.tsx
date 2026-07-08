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
import { showSuccessToast } from "@/lib/toast";
import {
  updateSubjectSchema,
  type UpdateSubjectInput,
} from "@/lib/validators/manager/update-subject";
import type { ManagerSubjectRow } from "@/types/manager-subject";

type EditSubjectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: ManagerSubjectRow;
  onUpdateSubject: (subject: ManagerSubjectRow) => void;
};

export function EditSubjectDialog({
  open,
  onOpenChange,
  subject,
  onUpdateSubject,
}: EditSubjectDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateSubjectInput>({
    resolver: zodResolver(updateSubjectSchema),
    mode: "onBlur",
    defaultValues: {
      name: subject.name,
      syllabus_link: subject.syllabus_link ?? "",
      reference_link: subject.reference_link ?? "",
      handout_link: subject.handout_link ?? "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: subject.name,
        syllabus_link: subject.syllabus_link ?? "",
        reference_link: subject.reference_link ?? "",
        handout_link: subject.handout_link ?? "",
      });
    }
  }, [open, reset, subject]);

  function onSubmit(values: UpdateSubjectInput) {
    onUpdateSubject({
      ...subject,
      name: values.name.trim(),
      syllabus_link: values.syllabus_link?.trim() || null,
      reference_link: values.reference_link?.trim() || null,
      handout_link: values.handout_link?.trim() || null,
    });

    showSuccessToast("Subject updated in the preview.");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit subject</DialogTitle>
          <DialogDescription>
            Update subject details and resource links. Preview-only until backend
            is connected.
          </DialogDescription>
        </DialogHeader>

        <form
          id="edit-subject-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="edit-subject-name" label="Name" hint="Required" />
            <Input
              id="edit-subject-name"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name ? (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-subject-syllabus"
              label="Syllabus link"
              hint="Optional URL"
            />
            <Input
              id="edit-subject-syllabus"
              type="url"
              aria-invalid={!!errors.syllabus_link}
              {...register("syllabus_link")}
            />
            {errors.syllabus_link ? (
              <p className="text-sm text-destructive">
                {errors.syllabus_link.message}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-subject-reference"
              label="Reference link"
              hint="Optional URL"
            />
            <Input
              id="edit-subject-reference"
              type="url"
              aria-invalid={!!errors.reference_link}
              {...register("reference_link")}
            />
            {errors.reference_link ? (
              <p className="text-sm text-destructive">
                {errors.reference_link.message}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-subject-handout"
              label="Handout link"
              hint="Optional URL"
            />
            <Input
              id="edit-subject-handout"
              type="url"
              aria-invalid={!!errors.handout_link}
              {...register("handout_link")}
            />
            {errors.handout_link ? (
              <p className="text-sm text-destructive">
                {errors.handout_link.message}
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
          <Button type="submit" form="edit-subject-form">
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
