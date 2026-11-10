"use client";

import { useEffect } from "react";
import { createStageAction } from "@/app/manager/subjects/actions";
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
  createStageSchema,
  type CreateStageInput,
} from "@/lib/validators/manager/create-stage";
import type {
  CreateStageActionState,
  ManagerStageRow,
} from "@/types/manager-stage";

const initialState: CreateStageActionState = {};

type CreateStageDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStageCreated: (stage: ManagerStageRow) => void;
};

export function CreateStageDialog({
  open,
  onOpenChange,
  onStageCreated,
}: CreateStageDialogProps) {
  const { state, formAction, isPending, handleOpenChange } =
    useMutationDialogForm({
      action: createStageAction,
      initialState,
      open,
      onOpenChange,
      onSuccess: (nextState) => {
        onOpenChange(false);
        if (nextState.stage) {
          onStageCreated(nextState.stage);
        }
      },
    });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useZodForm({
    schema: createStageSchema,
    mode: "onBlur",
    defaultValues: {
      name: "",
      period: 1,
      level: 1,
    },
  });

  useEffect(() => {
    if (!open) {
      reset({
        name: "",
        period: 1,
        level: 1,
      });
    }
  }, [open, reset]);

  function onSubmit(values: CreateStageInput) {
    const formData = new FormData();
    formData.set("name", values.name.trim());
    formData.set("period", String(values.period));
    formData.set("level", String(values.level));
    formAction(formData);
  }

  const nameError = errors.name?.message ?? state.fieldErrors?.name?.[0];
  const periodError = errors.period?.message ?? state.fieldErrors?.period?.[0];
  const levelError = errors.level?.message ?? state.fieldErrors?.level?.[0];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Create stage</DialogTitle>
          <DialogDescription>
            Add a curriculum stage to group subjects on the board.
          </DialogDescription>
        </DialogHeader>

        <form
          id="create-stage-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="create-stage-name"
              label="Name"
              hint="Required"
            />
            <Input
              id="create-stage-name"
              aria-invalid={!!nameError}
              disabled={isPending}
              {...register("name")}
            />
            {nameError ? (
              <p className="text-sm text-destructive">{nameError}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="create-stage-period"
                label="Period"
                hint="Required"
              />
              <Input
                id="create-stage-period"
                type="number"
                min="1"
                aria-invalid={!!periodError}
                disabled={isPending}
                {...register("period")}
              />
              {periodError ? (
                <p className="text-sm text-destructive">{periodError}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="create-stage-level"
                label="Level"
                hint="Required"
              />
              <Input
                id="create-stage-level"
                type="number"
                min="1"
                aria-invalid={!!levelError}
                disabled={isPending}
                {...register("level")}
              />
              {levelError ? (
                <p className="text-sm text-destructive">{levelError}</p>
              ) : null}
            </div>
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
          <Button type="submit" form="create-stage-form" disabled={isPending}>
            {isPending ? (
              <>
                <InlineSpinner className="mr-2" />
                Creating…
              </>
            ) : (
              "Create stage"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
