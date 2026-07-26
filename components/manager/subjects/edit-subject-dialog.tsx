"use client";

import { useActionState, useEffect, useTransition } from "react";
import { updateSubjectAction } from "@/app/manager/subjects/actions";
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
import { Input } from "@/components/ui/input";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { useZodForm } from "@/hooks/use-zod-form";
import {
  updateSubjectSchema,
  type UpdateSubjectInput,
} from "@/lib/validators/manager/update-subject";
import type {
  ManagerSubjectRow,
  UpdateSubjectActionState,
} from "@/types/manager-subject";

const initialState: UpdateSubjectActionState = {};

type EditSubjectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: ManagerSubjectRow;
  onSubjectUpdated: (subject: ManagerSubjectRow) => void;
};

export function EditSubjectDialog({
  open,
  onOpenChange,
  subject,
  onSubjectUpdated,
}: EditSubjectDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    updateSubjectAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;

  const handleOpenChange = usePendingAwareOpenChange(isPending, onOpenChange);

  useActionStateToast(state, isPending);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useZodForm({
    schema: updateSubjectSchema,
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

  useActionStateSuccess(state, isPending, (nextState) => {
    if (nextState.subject) {
      onSubjectUpdated(nextState.subject);
    }
    onOpenChange(false);
  });

  function onSubmit(values: UpdateSubjectInput) {
    const formData = new FormData();
    formData.set("id", subject.id);
    formData.set("name", values.name.trim());
    formData.set("syllabus_link", values.syllabus_link?.trim() ?? "");
    formData.set("reference_link", values.reference_link?.trim() ?? "");
    formData.set("handout_link", values.handout_link?.trim() ?? "");

    startTransition(() => {
      formAction(formData);
    });
  }

  const nameError = errors.name?.message ?? state.fieldErrors?.name?.[0];
  const syllabusError =
    errors.syllabus_link?.message ?? state.fieldErrors?.syllabus_link?.[0];
  const referenceError =
    errors.reference_link?.message ?? state.fieldErrors?.reference_link?.[0];
  const handoutError =
    errors.handout_link?.message ?? state.fieldErrors?.handout_link?.[0];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Edit subject</DialogTitle>
          <DialogDescription>
            Update subject details and resource links.
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
              aria-invalid={!!nameError}
              disabled={isPending}
              {...register("name")}
            />
            {nameError ? (
              <p className="text-sm text-destructive">{nameError}</p>
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
              aria-invalid={!!syllabusError}
              disabled={isPending}
              {...register("syllabus_link")}
            />
            {syllabusError ? (
              <p className="text-sm text-destructive">{syllabusError}</p>
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
              aria-invalid={!!referenceError}
              disabled={isPending}
              {...register("reference_link")}
            />
            {referenceError ? (
              <p className="text-sm text-destructive">{referenceError}</p>
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
              aria-invalid={!!handoutError}
              disabled={isPending}
              {...register("handout_link")}
            />
            {handoutError ? (
              <p className="text-sm text-destructive">{handoutError}</p>
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
          <Button type="submit" form="edit-subject-form" disabled={isPending}>
            {isPending ? <InlineSpinner data-icon="inline-start" /> : null}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
