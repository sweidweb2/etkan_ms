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
import { MANAGER_SCHEDULED_PAYMENT_STATUS_LABELS } from "@/lib/constants/manager-scheduled-payment-display";
import { SCHEDULED_PAYMENT_STATUSES } from "@/lib/constants/manager-scheduled-payment-status";
import { formatAccountCurrency } from "@/lib/constants/manager-subscribed-semester-display";
import { showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { toDateTimeLocalValue } from "@/lib/utils/datetime-local-value";
import {
  createScheduledPaymentSchema,
  parseScheduledPaymentAmount,
  type CreateScheduledPaymentInput,
} from "@/lib/validators/manager/scheduled-payment";
import type { ManagerScheduledPaymentRow } from "@/types/manager-scheduled-payment";

type AddScheduledPaymentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscribedSemesterId: string;
  semesterName: string;
  balanceDue: number;
  onAddScheduledPayment: (row: ManagerScheduledPaymentRow) => void;
};

export function AddScheduledPaymentDialog({
  open,
  onOpenChange,
  subscribedSemesterId,
  semesterName,
  balanceDue,
  onAddScheduledPayment,
}: AddScheduledPaymentDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useZodForm({
    schema: createScheduledPaymentSchema,
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
    if (!open) {
      reset({
        payment_date: toDateTimeLocalValue(new Date()),
        amount: "",
        status: SCHEDULED_PAYMENT_STATUSES.SCHEDULED,
        note: "",
      });
    }
  }, [open, reset]);

  function onSubmit(values: CreateScheduledPaymentInput) {
    const amount = parseScheduledPaymentAmount(values.amount);
    const now = new Date().toISOString();

    onAddScheduledPayment({
      id: crypto.randomUUID(),
      subscribed_semester_id: subscribedSemesterId,
      payment_date: new Date(values.payment_date).toISOString(),
      amount,
      status: values.status,
      note: values.note?.trim() ? values.note.trim() : null,
      created_at: now,
      updated_at: now,
    });
    showSuccessToast("Payment reminder scheduled.");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule payment reminder</DialogTitle>
          <DialogDescription>
            Create a reminder checkpoint for {semesterName}. Outstanding balance:{" "}
            {formatAccountCurrency(balanceDue)}. This is informational only and
            does not record an actual payment.
          </DialogDescription>
        </DialogHeader>

        <form
          id="add-scheduled-payment-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="add-scheduled-payment-date"
              label="Payment date"
              hint="Required"
            />
            <Input
              id="add-scheduled-payment-date"
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
              htmlFor="add-scheduled-payment-amount"
              label="Expected amount"
              hint="Optional"
            />
            <Input
              id="add-scheduled-payment-amount"
              type="number"
              min="0"
              step="0.01"
              placeholder={`Up to ${balanceDue}`}
              {...register("amount")}
              aria-invalid={!!errors.amount}
            />
            {errors.amount ? (
              <p className="text-sm text-destructive">{errors.amount.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="add-scheduled-payment-status"
              label="Status"
              hint="Required"
            />
            <Select
              value={selectedStatus || null}
              onValueChange={(value) => {
                if (!value) {
                  return;
                }

                setValue("status", value as CreateScheduledPaymentInput["status"], {
                  shouldValidate: true,
                });
              }}
            >
              <SelectTrigger
                id="add-scheduled-payment-status"
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
            <FieldLabel htmlFor="add-scheduled-payment-note" label="Note" hint="Optional" />
            <textarea
              id="add-scheduled-payment-note"
              rows={3}
              placeholder="Reminder context for you and the student…"
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
          <Button type="submit" form="add-scheduled-payment-form">
            Schedule reminder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
