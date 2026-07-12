"use client";

import { useActionState, useEffect, useTransition } from "react";
import { updateEquipmentAction } from "@/app/manager/equipments/actions";
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
import { useZodForm } from "@/hooks/use-zod-form";
import { cn } from "@/lib/utils";
import {
  updateEquipmentSchema,
  type UpdateEquipmentInput,
} from "@/lib/validators/manager/update-equipment";
import type {
  ManagerEquipmentRow,
  UpdateEquipmentActionState,
} from "@/types/manager-equipment";

const initialState: UpdateEquipmentActionState = {};

type EditEquipmentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: ManagerEquipmentRow | null;
  onEquipmentUpdated: () => void;
};

export function EditEquipmentDialog({
  open,
  onOpenChange,
  equipment,
  onEquipmentUpdated,
}: EditEquipmentDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    updateEquipmentAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;

  useActionStateToast(state, isPending);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useZodForm({
    schema: updateEquipmentSchema,
    mode: "onBlur",
    defaultValues: {
      id: equipment?.id ?? "",
      name: equipment?.name ?? "",
      description: equipment?.description ?? "",
      quantity: equipment?.quantity ?? 0,
      unit_price: equipment?.unit_price ?? 0,
    },
  });

  useEffect(() => {
    if (!open || !equipment) {
      return;
    }

    reset({
      id: equipment.id,
      name: equipment.name,
      description: equipment.description ?? "",
      quantity: equipment.quantity,
      unit_price: equipment.unit_price,
    });
  }, [equipment, open, reset]);

  useActionStateSuccess(state, isPending, () => {
    onOpenChange(false);
    onEquipmentUpdated();
  });

  function onSubmit(values: UpdateEquipmentInput) {
    const formData = new FormData();
    formData.set("id", values.id);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit equipment</DialogTitle>
          <DialogDescription>
            Update inventory details for {equipment?.name ?? "this item"}.
          </DialogDescription>
        </DialogHeader>

        <form
          id="edit-equipment-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <input type="hidden" {...register("id")} />

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-equipment-name"
              label="Name"
              hint="Required"
            />
            <Input
              id="edit-equipment-name"
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
              htmlFor="edit-equipment-description"
              label="Description"
              hint="Optional"
            />
            <textarea
              id="edit-equipment-description"
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
                htmlFor="edit-equipment-quantity"
                label="Quantity"
                hint="Required"
              />
              <Input
                id="edit-equipment-quantity"
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
                htmlFor="edit-equipment-unit-price"
                label="Unit price"
                hint="Required"
              />
              <Input
                id="edit-equipment-unit-price"
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
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-equipment-form"
            disabled={!equipment || isPending}
          >
            {isPending ? (
              <InlineSpinner />
            ) : (
              "Save changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
