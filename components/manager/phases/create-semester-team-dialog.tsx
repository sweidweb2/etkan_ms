"use client";

import { useEffect } from "react";
import { createSemesterTeamAction } from "@/app/manager/semesters/actions";
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
  createSemesterTeamSchema,
  type CreateSemesterTeamInput,
} from "@/lib/validators/manager/create-semester-team";
import type {
  CreateSemesterTeamActionState,
  ManagerSemesterTeamRow,
} from "@/types/manager-semester-team";

const initialState: CreateSemesterTeamActionState = {};

type CreateSemesterTeamDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTeamCreated: (team: ManagerSemesterTeamRow) => void;
};

export function CreateSemesterTeamDialog({
  open,
  onOpenChange,
  onTeamCreated,
}: CreateSemesterTeamDialogProps) {
  const { state, formAction, isPending, handleOpenChange } =
    useMutationDialogForm({
      action: createSemesterTeamAction,
      initialState,
      open,
      onOpenChange,
      onSuccess: (nextState) => {
        onOpenChange(false);
        if (nextState.team) {
          onTeamCreated(nextState.team);
        }
      },
    });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useZodForm({
    schema: createSemesterTeamSchema,
    mode: "onBlur",
    defaultValues: {
      name: "",
    },
  });

  useEffect(() => {
    if (!open) {
      reset({ name: "" });
    }
  }, [open, reset]);

  function onSubmit(values: CreateSemesterTeamInput) {
    const formData = new FormData();
    formData.set("name", values.name.trim());
    formAction(formData);
  }

  const nameError = errors.name?.message ?? state.fieldErrors?.name?.[0];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Create team</DialogTitle>
          <DialogDescription>
            Add an organizer team to group semesters on the board.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="semester-team-name" label="Name" hint="Required" />
            <Input
              id="semester-team-name"
              aria-invalid={!!nameError}
              disabled={isPending}
              {...register("name")}
            />
            {nameError ? (
              <p className="text-sm text-destructive">{nameError}</p>
            ) : null}
          </div>

          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <InlineSpinner className="mr-2" /> : null}
              Create team
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
