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
import { Input } from "@/components/ui/input";
import { showSuccessToast } from "@/lib/toast";
import {
  createSubjectSchema,
  type CreateSubjectInput,
} from "@/lib/validators/manager/create-subject";
import type { ManagerSubjectRow } from "@/types/manager-subject";

type AddSubjectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateSubject: (subject: ManagerSubjectRow) => void;
};

export function AddSubjectDialog({
  open,
  onOpenChange,
  onCreateSubject,
}: AddSubjectDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useZodForm({
    schema: createSubjectSchema,
    mode: "onBlur",
    defaultValues: {
      name: "",
      syllabus_link: "",
      reference_link: "",
      handout_link: "",
    },
  });

  useEffect(() => {
    if (!open) {
      reset({
        name: "",
        syllabus_link: "",
        reference_link: "",
        handout_link: "",
      });
    }
  }, [open, reset]);

  function onSubmit(values: CreateSubjectInput) {
    onCreateSubject({
      id: crypto.randomUUID(),
      name: values.name.trim(),
      syllabus_link: values.syllabus_link?.trim() || null,
      reference_link: values.reference_link?.trim() || null,
      handout_link: values.handout_link?.trim() || null,
      created_at: new Date().toISOString(),
      nb_sessions: 0,
      class_count: 0,
    });

    showSuccessToast("Subject added to the preview list.");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add subject</DialogTitle>
          <DialogDescription>
            Create a subject with optional resource links. Preview-only until
            backend is connected.
          </DialogDescription>
        </DialogHeader>

        <form
          id="add-subject-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="add-subject-name"
              label="Name"
              hint="Required"
            />
            <Input
              id="add-subject-name"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name ? (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="add-subject-syllabus"
              label="Syllabus link"
              hint="Optional URL"
            />
            <Input
              id="add-subject-syllabus"
              type="url"
              placeholder="https://"
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
              htmlFor="add-subject-reference"
              label="Reference link"
              hint="Optional URL"
            />
            <Input
              id="add-subject-reference"
              type="url"
              placeholder="https://"
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
              htmlFor="add-subject-handout"
              label="Handout link"
              hint="Optional URL"
            />
            <Input
              id="add-subject-handout"
              type="url"
              placeholder="https://"
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
          <Button type="submit" form="add-subject-form">
            Create subject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
