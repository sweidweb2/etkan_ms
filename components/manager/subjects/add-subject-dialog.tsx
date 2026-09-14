"use client";

import { useEffect } from "react";
import { createSubjectAction } from "@/app/manager/subjects/actions";
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
import { useMutationDialogForm } from "@/hooks/use-mutation-dialog-form";
import { useZodForm } from "@/hooks/use-zod-form";
import {
  createSubjectSchema,
  type CreateSubjectInput,
} from "@/lib/validators/manager/create-subject";
import type { CreateSubjectActionState, ManagerSubjectRow } from "@/types/manager-subject";

const initialState: CreateSubjectActionState = {};

type AddSubjectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubjectCreated: (subject: ManagerSubjectRow) => void;
};

export function AddSubjectDialog({
  open,
  onOpenChange,
  onSubjectCreated,
}: AddSubjectDialogProps) {
  const { state, formAction, isPending, handleOpenChange } =
    useMutationDialogForm({
      action: createSubjectAction,
      initialState,
      open,
      onOpenChange,
      onSuccess: (nextState) => {
        onOpenChange(false);
        if (nextState.subject) {
          onSubjectCreated(nextState.subject);
        }
      },
    });

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
      nb_sessions: 0,
      syllabus_link: "",
      reference_link: "",
      handout_link: "",
    },
  });

  useEffect(() => {
    if (!open) {
      reset({
        name: "",
        nb_sessions: 0,
        syllabus_link: "",
        reference_link: "",
        handout_link: "",
      });
    }
  }, [open, reset]);

  function onSubmit(values: CreateSubjectInput) {
    const formData = new FormData();
    formData.set("name", values.name.trim());
    formData.set("nb_sessions", String(values.nb_sessions));
    formData.set("syllabus_link", values.syllabus_link?.trim() ?? "");
    formData.set("reference_link", values.reference_link?.trim() ?? "");
    formData.set("handout_link", values.handout_link?.trim() ?? "");
    formAction(formData);
  }

  const nameError = errors.name?.message ?? state.fieldErrors?.name?.[0];
  const sessionsError =
    errors.nb_sessions?.message ?? state.fieldErrors?.nb_sessions?.[0];
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
          <DialogTitle>Add subject</DialogTitle>
          <DialogDescription>
            Create a subject with planned session count and optional resource
            links.
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
              htmlFor="add-subject-sessions"
              label="Number of sessions"
              hint="Required"
            />
            <Input
              id="add-subject-sessions"
              type="number"
              min="0"
              aria-invalid={!!sessionsError}
              disabled={isPending}
              {...register("nb_sessions")}
            />
            {sessionsError ? (
              <p className="text-sm text-destructive">{sessionsError}</p>
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
              htmlFor="add-subject-reference"
              label="Reference link"
              hint="Optional URL"
            />
            <Input
              id="add-subject-reference"
              type="url"
              placeholder="https://"
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
              htmlFor="add-subject-handout"
              label="Handout link"
              hint="Optional URL"
            />
            <Input
              id="add-subject-handout"
              type="url"
              placeholder="https://"
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
            disabled={isPending}
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="add-subject-form"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <InlineSpinner className="mr-2" />
                Creating…
              </>
            ) : (
              "Create subject"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
