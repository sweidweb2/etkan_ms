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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BORROW_EQUIPMENT_STATUSES,
  BORROW_EQUIPMENT_STATUS_VALUES,
  type BorrowEquipmentStatusValue,
} from "@/lib/constants/manager-borrow-equipment-status";
import { MANAGER_BORROW_EQUIPMENT_STATUS_LABELS } from "@/lib/constants/manager-student-borrow-equipment-display";
import { showSuccessToast } from "@/lib/toast";
import { getLocalIsoDate } from "@/lib/utils/local-iso-date";
import {
  updateBorrowEquipmentSchema,
  type UpdateBorrowEquipmentInput,
} from "@/lib/validators/manager/update-borrow-equipment";
import type { ManagerStudentBorrowEquipmentRow } from "@/types/manager-student-borrow-equipment";

type EditBorrowEquipmentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  borrowRow: ManagerStudentBorrowEquipmentRow | null;
  onUpdateBorrow: (borrowRow: ManagerStudentBorrowEquipmentRow) => void;
};

function toDateInputValue(value: string | null): string {
  if (!value) {
    return "";
  }

  return value.slice(0, 10);
}

export function EditBorrowEquipmentDialog({
  open,
  onOpenChange,
  borrowRow,
  onUpdateBorrow,
}: EditBorrowEquipmentDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useZodForm({
    schema: updateBorrowEquipmentSchema,
    mode: "onBlur",
    defaultValues: {
      quantity: 1,
      status: BORROW_EQUIPMENT_STATUSES.BORROWED,
      returnedAt: "",
    },
  });

  const selectedStatus = watch("status");

  useEffect(() => {
    if (!open || !borrowRow) {
      return;
    }

    reset({
      quantity: borrowRow.quantity,
      status: borrowRow.status,
      returnedAt: toDateInputValue(borrowRow.returned_at),
    });
  }, [borrowRow, open, reset]);

  function onSubmit(values: UpdateBorrowEquipmentInput) {
    if (!borrowRow) {
      return;
    }

    const returnedAt =
      values.status === BORROW_EQUIPMENT_STATUSES.RETURNED
        ? values.returnedAt?.trim()
          ? `${values.returnedAt.trim()}T12:00:00.000Z`
          : new Date().toISOString()
        : null;

    onUpdateBorrow({
      ...borrowRow,
      quantity: values.quantity,
      status: values.status as BorrowEquipmentStatusValue,
      returned_at: returnedAt,
    });

    showSuccessToast("Borrow record updated.");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit borrow record</DialogTitle>
          <DialogDescription>
            Update borrow_equipment fields. Equipment and user are fixed for this
            row.
          </DialogDescription>
        </DialogHeader>

        {borrowRow ? (
          <form
            id="edit-borrow-equipment-form"
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
            noValidate
          >
            <div className="rounded-lg bg-muted/30 px-3 py-2 text-sm">
              <p className="font-medium">{borrowRow.equipment_name}</p>
              <p className="text-xs text-muted-foreground">
                Equipment ID: {borrowRow.equipment_id}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="edit-borrow-quantity"
                label="Quantity"
                hint="borrow_equipment.quantity"
              />
              <Input
                id="edit-borrow-quantity"
                type="number"
                min={1}
                max={999}
                aria-invalid={!!errors.quantity}
                {...register("quantity", { valueAsNumber: true })}
              />
              {errors.quantity ? (
                <p className="text-sm text-destructive">{errors.quantity.message}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="edit-borrow-status"
                label="Status"
                hint="borrow_equipment.status"
              />
              <Select
                value={selectedStatus}
                onValueChange={(value) => {
                  if (!value) {
                    return;
                  }

                  setValue("status", value as BorrowEquipmentStatusValue, {
                    shouldValidate: true,
                  });
                }}
              >
                <SelectTrigger
                  id="edit-borrow-status"
                  className="w-full"
                  aria-invalid={!!errors.status}
                >
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {BORROW_EQUIPMENT_STATUS_VALUES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {MANAGER_BORROW_EQUIPMENT_STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.status ? (
                <p className="text-sm text-destructive">{errors.status.message}</p>
              ) : null}
            </div>

            {selectedStatus === BORROW_EQUIPMENT_STATUSES.RETURNED ? (
              <div className="flex flex-col gap-2">
                <FieldLabel
                  htmlFor="edit-borrow-returned-at"
                  label="Returned date"
                  hint="borrow_equipment.returned_at"
                />
                <Input
                  id="edit-borrow-returned-at"
                  type="date"
                  max={getLocalIsoDate()}
                  aria-invalid={!!errors.returnedAt}
                  {...register("returnedAt")}
                />
                {errors.returnedAt ? (
                  <p className="text-sm text-destructive">
                    {errors.returnedAt.message}
                  </p>
                ) : null}
              </div>
            ) : null}
          </form>
        ) : null}

        <DialogFooter className="mt-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" form="edit-borrow-equipment-form" disabled={!borrowRow}>
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
