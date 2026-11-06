"use client";

import { useEffect } from "react";
import { createSemesterAction } from "@/app/manager/semesters/actions";
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
  createPhaseSchema,
  type CreatePhaseInput,
} from "@/lib/validators/manager/create-phase";
import type {
  CreateSemesterActionState,
  ManagerSemesterRow,
} from "@/types/manager-phase";

const initialState: CreateSemesterActionState = {};

type AddPhaseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSemesterCreated: (semester: ManagerSemesterRow) => void;
};

export function AddPhaseDialog({
  open,
  onOpenChange,
  onSemesterCreated,
}: AddPhaseDialogProps) {
  const { state, formAction, isPending, handleOpenChange } =
    useMutationDialogForm({
      action: createSemesterAction,
      initialState,
      open,
      onOpenChange,
      onSuccess: (nextState) => {
        onOpenChange(false);
        if (nextState.semester) {
          onSemesterCreated(nextState.semester);
        }
      },
    });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useZodForm({
    schema: createPhaseSchema,
    mode: "onBlur",
    defaultValues: {
      name: "",
      semester_code: "",
    },
  });

  useEffect(() => {
    if (!open) {
      reset({ name: "", semester_code: "" });
    }
  }, [open, reset]);

  function onSubmit(values: CreatePhaseInput) {
    const formData = new FormData();
    formData.set("name", values.name.trim());
    formData.set("semester_code", values.semester_code?.trim() ?? "");
    formAction(formData);
  }

  const nameError = errors.name?.message ?? state.fieldErrors?.name?.[0];
  const codeError =
    errors.semester_code?.message ?? state.fieldErrors?.semester_code?.[0];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Add semester</DialogTitle>
          <DialogDescription>
            Create a semester with a name and a unique 4-digit code. Leave the
            code blank to generate one automatically.
          </DialogDescription>
        </DialogHeader>

        <form
          id="add-semester-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="add-semester-name" label="Name" hint="Required" />
            <Input
              id="add-semester-name"
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
              htmlFor="add-semester-code"
              label="Semester code"
              hint="Optional"
            />
            <Input
              id="add-semester-code"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              placeholder="Auto-generate"
              aria-invalid={!!codeError}
              disabled={isPending}
              className="font-mono tracking-wider"
              {...register("semester_code")}
            />
            {codeError ? (
              <p className="text-sm text-destructive">{codeError}</p>
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
          <Button type="submit" form="add-semester-form" disabled={isPending}>
            {isPending ? (
              <>
                <InlineSpinner className="mr-2" />
                Creating…
              </>
            ) : (
              "Create semester"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
