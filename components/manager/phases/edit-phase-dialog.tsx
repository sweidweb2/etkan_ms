"use client";

import { useEffect, useTransition } from "react";
import { useFormActionState as useActionState } from "@/hooks/use-form-action-state";
import { updateSemesterAction } from "@/app/manager/semesters/actions";
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
  updatePhaseSchema,
  type UpdatePhaseInput,
} from "@/lib/validators/manager/update-phase";
import type {
  ManagerSemesterRow,
  UpdateSemesterActionState,
} from "@/types/manager-phase";

const initialState: UpdateSemesterActionState = {};

type EditPhaseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  semester: ManagerSemesterRow;
  onSemesterUpdated: (semester: ManagerSemesterRow) => void;
};

export function EditPhaseDialog({
  open,
  onOpenChange,
  semester,
  onSemesterUpdated,
}: EditPhaseDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    updateSemesterAction,
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
    schema: updatePhaseSchema,
    mode: "onBlur",
    defaultValues: {
      id: semester.id,
      name: semester.name,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        id: semester.id,
        name: semester.name,
      });
    }
  }, [open, reset, semester]);

  useActionStateSuccess(
    state,
    isPending,
    (nextState) => {
      if (!nextState.semester) {
        return;
      }

      onOpenChange(false);
      onSemesterUpdated(nextState.semester);
    },
    (nextState) => Boolean(nextState.success && nextState.semester)
  );

  function onSubmit(values: UpdatePhaseInput) {
    const formData = new FormData();
    formData.set("id", values.id);
    formData.set("name", values.name.trim());

    startTransition(() => {
      formAction(formData);
    });
  }

  const nameError = errors.name?.message ?? state.fieldErrors?.name?.[0];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Edit semester</DialogTitle>
          <DialogDescription>
            Update the semester name. Code cannot be changed.
          </DialogDescription>
        </DialogHeader>

        <form
          id="edit-semester-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <input type="hidden" {...register("id")} />

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-semester-name"
              label="Name"
              hint="Required"
            />
            <Input
              id="edit-semester-name"
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
              htmlFor="edit-semester-code"
              label="Semester code"
              hint="Read-only"
            />
            <Input
              id="edit-semester-code"
              value={semester.semester_code}
              readOnly
              disabled
              className="font-mono tracking-wider"
            />
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
          <Button type="submit" form="edit-semester-form" disabled={isPending}>
            {isPending ? (
              <>
                <InlineSpinner className="mr-2" />
                Saving…
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
