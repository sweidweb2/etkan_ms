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
import { cn } from "@/lib/utils";
import {
  createEquipmentSchema,
  type CreateEquipmentInput,
} from "@/lib/validators/manager/create-equipment";
import type { ManagerEquipmentRow } from "@/types/manager-equipment";

type AddEquipmentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateEquipment: (equipment: ManagerEquipmentRow) => void;
};

export function AddEquipmentDialog({
  open,
  onOpenChange,
  onCreateEquipment,
}: AddEquipmentDialogProps) {
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

  function onSubmit(values: CreateEquipmentInput) {
    onCreateEquipment({
      id: crypto.randomUUID(),
      name: values.name.trim(),
      description: values.description?.trim() || null,
      quantity: values.quantity,
      unit_price: values.unit_price,
      created_at: new Date().toISOString(),
      borrowed_quantity: 0,
    });

    showSuccessToast("Equipment added to the preview list.");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add equipment</DialogTitle>
          <DialogDescription>
            Create a new inventory item with quantity and unit price. Preview-only
            until backend is connected.
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
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name ? (
              <p className="text-sm text-destructive">{errors.name.message}</p>
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
              aria-invalid={!!errors.description}
              className={cn(
                "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
              )}
              {...register("description")}
            />
            {errors.description ? (
              <p className="text-sm text-destructive">
                {errors.description.message}
              </p>
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
                aria-invalid={!!errors.quantity}
                {...register("quantity")}
              />
              {errors.quantity ? (
                <p className="text-sm text-destructive">
                  {errors.quantity.message}
                </p>
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
                aria-invalid={!!errors.unit_price}
                {...register("unit_price")}
              />
              {errors.unit_price ? (
                <p className="text-sm text-destructive">
                  {errors.unit_price.message}
                </p>
              ) : null}
            </div>
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
          <Button type="submit" form="add-equipment-form">
            Create equipment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
