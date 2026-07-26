"use client";

import { useActionState, useEffect, useTransition } from "react";
import { createEquipmentAction } from "@/app/manager/equipments/actions";
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
import { cn } from "@/lib/utils";
import {
  createEquipmentSchema,
  type CreateEquipmentInput,
} from "@/lib/validators/manager/create-equipment";
import type { CreateEquipmentActionState } from "@/types/manager-equipment";

const initialState: CreateEquipmentActionState = {};

type AddEquipmentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEquipmentCreated: () => void;
};

export function AddEquipmentDialog({
  open,
  onOpenChange,
  onEquipmentCreated,
}: AddEquipmentDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    createEquipmentAction,
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
    schema: createEquipmentSchema,
    mode: "onBlur",
    defaultValues: {
      name: "",
      description: "",
      quantity: 0,
      unit_price: 0,
    },
  });

  useEffect(() => {
    if (!open) {
      reset({
        name: "",
        description: "",
        quantity: 0,
        unit_price: 0,
      });
    }
  }, [open, reset]);

  useActionStateSuccess(state, isPending, () => {
    onOpenChange(false);
    onEquipmentCreated();
  });

  function onSubmit(values: CreateEquipmentInput) {
    const formData = new FormData();
    formData.set("name", values.name.trim());
    formData.set("description", values.description?.trim() ?? "");
    formData.set("quantity", String(values.quantity));
    formData.set("unit_price", String(values.unit_price));

    startTransition(() => {
      formAction(formData);
    });
  }

  const nameError = errors.name?.message ?? state.fieldErrors?.name?.[0];
  const descriptionError =
    errors.description?.message ?? state.fieldErrors?.description?.[0];
  const quantityError =
    errors.quantity?.message ?? state.fieldErrors?.quantity?.[0];
  const unitPriceError =
    errors.unit_price?.message ?? state.fieldErrors?.unit_price?.[0];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Add equipment</DialogTitle>
          <DialogDescription>
            Create a new inventory item with quantity and unit price.
          </DialogDescription>
        </DialogHeader>

        <form
          id="add-equipment-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="add-equipment-name"
              label="Name"
              hint="Required"
            />
            <Input
              id="add-equipment-name"
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
              htmlFor="add-equipment-description"
              label="Description"
              hint="Optional"
            />
            <textarea
              id="add-equipment-description"
              rows={3}
              aria-invalid={!!descriptionError}
              disabled={isPending}
              className={cn(
                "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
              )}
              {...register("description")}
            />
            {descriptionError ? (
              <p className="text-sm text-destructive">{descriptionError}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="add-equipment-quantity"
                label="Quantity"
                hint="Required"
              />
              <Input
                id="add-equipment-quantity"
                type="number"
                min={0}
                step={1}
                aria-invalid={!!quantityError}
                disabled={isPending}
                {...register("quantity")}
              />
              {quantityError ? (
                <p className="text-sm text-destructive">{quantityError}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="add-equipment-unit-price"
                label="Unit price"
                hint="Required"
              />
              <Input
                id="add-equipment-unit-price"
                type="number"
                min={0}
                step={0.01}
                aria-invalid={!!unitPriceError}
                disabled={isPending}
                {...register("unit_price")}
              />
              {unitPriceError ? (
                <p className="text-sm text-destructive">{unitPriceError}</p>
              ) : null}
            </div>
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
          <Button type="submit" form="add-equipment-form" disabled={isPending}>
            {isPending ? (
              <InlineSpinner />
            ) : (
              "Create equipment"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
