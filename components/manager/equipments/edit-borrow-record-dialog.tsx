"use client";

import { useActionState, useEffect, useMemo, useTransition } from "react";
import { updateBorrowRecordAction } from "@/app/manager/equipments/actions";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { useZodForm } from "@/hooks/use-zod-form";
import {
  BORROW_EQUIPMENT_STATUSES,
  BORROW_EQUIPMENT_STATUS_VALUES,
  type BorrowEquipmentStatusValue,
} from "@/lib/constants/manager-borrow-equipment-status";
import { getMaxEditableBorrowQuantity } from "@/lib/constants/manager-equipment-display";
import { MANAGER_BORROW_EQUIPMENT_STATUS_LABELS } from "@/lib/constants/manager-student-borrow-equipment-display";
import { getLocalIsoDate } from "@/lib/utils/local-iso-date";
import {
  updateBorrowEquipmentSchema,
  type UpdateBorrowEquipmentInput,
} from "@/lib/validators/manager/update-borrow-equipment";
import type { UpdateBorrowRecordActionState } from "@/types/manager-borrow-equipment-list";
import type { ManagerBorrowEquipmentListRow } from "@/types/manager-borrow-equipment-list";
import type { ManagerEquipmentRow } from "@/types/manager-equipment";

const initialState: UpdateBorrowRecordActionState = {};

type EditBorrowRecordDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  borrowRow: ManagerBorrowEquipmentListRow | null;
  equipments: ManagerEquipmentRow[];
  onSaved: () => void;
};

function toDateInputValue(value: string | null): string {
  if (!value) {
    return "";
  }

  return value.slice(0, 10);
}

export function EditBorrowRecordDialog({
  open,
  onOpenChange,
  borrowRow,
  equipments,
  onSaved,
}: EditBorrowRecordDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    updateBorrowRecordAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;

  useActionStateToast(state, isPending);

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
  const selectedQuantity = watch("quantity");

  const equipment = useMemo(() => {
    if (!borrowRow) {
      return null;
    }

    return equipments.find((row) => row.id === borrowRow.equipment_id) ?? null;
  }, [borrowRow, equipments]);

  const maxQuantity = useMemo(() => {
    if (!borrowRow || !equipment) {
      return 999;
    }

    return getMaxEditableBorrowQuantity(
      equipment,
      borrowRow,
      selectedStatus as BorrowEquipmentStatusValue
    );
  }, [borrowRow, equipment, selectedStatus]);

  const quantityExceedsStock =
    selectedStatus === BORROW_EQUIPMENT_STATUSES.BORROWED &&
    Number(selectedQuantity ?? 0) > maxQuantity;

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

  useActionStateSuccess(state, isPending, () => {
    onOpenChange(false);
    onSaved();
  });

  function onSubmit(values: UpdateBorrowEquipmentInput) {
    if (!borrowRow || quantityExceedsStock) {
      return;
    }

    const formData = new FormData();
    formData.set("id", borrowRow.id);
    formData.set("quantity", String(values.quantity));
    formData.set("status", values.status);
    if (values.returnedAt) {
      formData.set("returnedAt", values.returnedAt);
    }

    startTransition(() => {
      formAction(formData);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit borrow record</DialogTitle>
          <DialogDescription>
            Update quantity and status for this borrow. Stock limits apply only
            while status is borrowed.
          </DialogDescription>
        </DialogHeader>

        {borrowRow ? (
          <form
            id="edit-borrow-record-form"
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
            noValidate
          >
            <div className="rounded-lg bg-muted/30 px-3 py-2 text-sm">
              <p className="font-medium">{borrowRow.equipment_name}</p>
              <p className="text-xs text-muted-foreground">
                Student: {borrowRow.student_name}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="edit-borrow-quantity"
                label="Quantity"
                hint="Required"
              />
              <Input
                id="edit-borrow-quantity"
                type="number"
                min={1}
                max={maxQuantity < 999 ? maxQuantity : 999}
                aria-invalid={!!errors.quantity || quantityExceedsStock}
                {...register("quantity", { valueAsNumber: true })}
              />
              {selectedStatus === BORROW_EQUIPMENT_STATUSES.BORROWED ? (
                <p className="text-xs text-muted-foreground">
                  Maximum available: {maxQuantity}
                </p>
              ) : null}
              {errors.quantity ? (
                <p className="text-sm text-destructive">
                  {errors.quantity.message}
                </p>
              ) : null}
              {quantityExceedsStock ? (
                <p className="text-sm text-destructive">
                  Not enough stock. Maximum quantity is {maxQuantity}.
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="edit-borrow-status"
                label="Status"
                hint="Required"
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
                  hint="Required"
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
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-borrow-record-form"
            disabled={!borrowRow || isPending || quantityExceedsStock}
          >
            {isPending ? <InlineSpinner /> : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
