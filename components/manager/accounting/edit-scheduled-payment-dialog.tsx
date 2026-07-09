"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { MANAGER_SCHEDULED_PAYMENT_STATUS_LABELS } from "@/lib/constants/manager-scheduled-payment-display";
import {
  SCHEDULED_PAYMENT_STATUSES,
  type ScheduledPaymentStatusValue,
} from "@/lib/constants/manager-scheduled-payment-status";
import { showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { toDateTimeLocalValue } from "@/lib/utils/datetime-local-value";
import {
  parseScheduledPaymentAmount,
  updateScheduledPaymentSchema,
  type UpdateScheduledPaymentInput,
} from "@/lib/validators/manager/scheduled-payment";
import type { ManagerScheduledPaymentRow } from "@/types/manager-scheduled-payment";

type EditScheduledPaymentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduledPayment: ManagerScheduledPaymentRow | null;
  onUpdateScheduledPayment: (row: ManagerScheduledPaymentRow) => void;
};

export function EditScheduledPaymentDialog({
  open,
  onOpenChange,
  scheduledPayment,
  onUpdateScheduledPayment,
}: EditScheduledPaymentDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UpdateScheduledPaymentInput>({
    resolver: zodResolver(updateScheduledPaymentSchema),
    mode: "onBlur",
    defaultValues: {
      payment_date: toDateTimeLocalValue(new Date()),
      amount: "",
      status: SCHEDULED_PAYMENT_STATUSES.SCHEDULED,
      note: "",
    },
  });

  const selectedStatus = watch("status");

  useEffect(() => {
    if (!open || !scheduledPayment) {
      return;
    }

    reset({
      payment_date: toDateTimeLocalValue(new Date(scheduledPayment.payment_date)),
      amount: scheduledPayment.amount ?? "",
      status: scheduledPayment.status,
      note: scheduledPayment.note ?? "",
    });
  }, [open, reset, scheduledPayment]);

  function onSubmit(values: UpdateScheduledPaymentInput) {
    if (!scheduledPayment) {
      return;
    }

    onUpdateScheduledPayment({
      ...scheduledPayment,
      payment_date: new Date(values.payment_date).toISOString(),
      amount: parseScheduledPaymentAmount(values.amount),
      status: values.status,
      note: values.note?.trim() ? values.note.trim() : null,
      updated_at: new Date().toISOString(),
    });
    showSuccessToast("Scheduled payment updated.");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit scheduled payment</DialogTitle>
          <DialogDescription>
            Update this payment reminder checkpoint. Preview-only until backend is
            connected.
          </DialogDescription>
        </DialogHeader>

        <form
          id="edit-scheduled-payment-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-scheduled-payment-date"
              label="Payment date"
              hint="Required"
            />
            <Input
              id="edit-scheduled-payment-date"
              type="datetime-local"
              {...register("payment_date")}
              aria-invalid={!!errors.payment_date}
            />
            {errors.payment_date ? (
              <p className="text-sm text-destructive">
                {errors.payment_date.message}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-scheduled-payment-amount"
              label="Expected amount"
              hint="Optional"
            />
            <Input
              id="edit-scheduled-payment-amount"
              type="number"
              min="0"
              step="0.01"
              {...register("amount")}
              aria-invalid={!!errors.amount}
            />
            {errors.amount ? (
              <p className="text-sm text-destructive">{errors.amount.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-scheduled-payment-status"
              label="Status"
              hint="Required"
            />
            <Select
              value={selectedStatus || null}
              onValueChange={(value) => {
                if (!value) {
                  return;
                }

                setValue("status", value as UpdateScheduledPaymentInput["status"], {
                  shouldValidate: true,
                });
              }}
            >
              <SelectTrigger
                id="edit-scheduled-payment-status"
                className="w-full"
                aria-invalid={!!errors.status}
              >
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent align="start">
                {Object.entries(MANAGER_SCHEDULED_PAYMENT_STATUS_LABELS).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
            {errors.status ? (
              <p className="text-sm text-destructive">{errors.status.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="edit-scheduled-payment-note" label="Note" hint="Optional" />
            <textarea
              id="edit-scheduled-payment-note"
              rows={3}
              aria-invalid={!!errors.note}
              className={cn(
                "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
              )}
              {...register("note")}
            />
            {errors.note ? (
              <p className="text-sm text-destructive">{errors.note.message}</p>
            ) : null}
          </div>
        </form>

        <DialogFooter className="mt-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="edit-scheduled-payment-form" disabled={!scheduledPayment}>
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
