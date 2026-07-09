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
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_VALUES,
} from "@/lib/constants/manager-payment-methods";
import { showSuccessToast } from "@/lib/toast";
import { toDateTimeLocalValue } from "@/lib/utils/datetime-local-value";
import {
  updatePaymentSchema,
  type UpdatePaymentInput,
} from "@/lib/validators/manager/update-payment";
import type { ManagerStudentPaymentRow } from "@/types/manager-student-account";

type EditPaymentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: ManagerStudentPaymentRow | null;
  onUpdatePayment: (payment: ManagerStudentPaymentRow) => void;
};

export function EditPaymentDialog({
  open,
  onOpenChange,
  payment,
  onUpdatePayment,
}: EditPaymentDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useZodForm({
    schema: updatePaymentSchema,
    mode: "onBlur",
    defaultValues: {
      amount: 0,
      currency: "USD",
      method: PAYMENT_METHOD_VALUES[0],
      paid_at: toDateTimeLocalValue(new Date()),
    },
  });

  const selectedMethod = watch("method");

  useEffect(() => {
    if (!open || !payment) {
      return;
    }

    reset({
      amount: payment.amount,
      currency: payment.currency,
      method: (payment.method ?? PAYMENT_METHOD_VALUES[0]) as UpdatePaymentInput["method"],
      paid_at: toDateTimeLocalValue(new Date(payment.paid_at)),
    });
  }, [open, payment, reset]);

  function onSubmit(values: UpdatePaymentInput) {
    if (!payment) {
      return;
    }

    onUpdatePayment({
      ...payment,
      amount: values.amount,
      currency: values.currency,
      method: values.method,
      paid_at: new Date(values.paid_at).toISOString(),
    });
    showSuccessToast("Payment updated.");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit payment</DialogTitle>
          <DialogDescription>
            Update payment details for {payment?.semester_name ?? "this subscription"}.
            Preview-only until backend is connected.
          </DialogDescription>
        </DialogHeader>

        <form
          id="edit-payment-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="edit-payment-amount" label="Amount" hint="Required" />
            <Input
              id="edit-payment-amount"
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
              htmlFor="edit-payment-currency"
              label="Currency"
              hint="Required"
            />
            <Input
              id="edit-payment-currency"
              {...register("currency")}
              aria-invalid={!!errors.currency}
            />
            {errors.currency ? (
              <p className="text-sm text-destructive">{errors.currency.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-payment-method"
              label="Payment method"
              hint="Required"
            />
            <Select
              value={selectedMethod || null}
              onValueChange={(value) => {
                if (!value) {
                  return;
                }

                setValue("method", value as UpdatePaymentInput["method"], {
                  shouldValidate: true,
                });
              }}
            >
              <SelectTrigger
                id="edit-payment-method"
                className="w-full"
                aria-invalid={!!errors.method}
              >
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent align="start">
                {PAYMENT_METHOD_VALUES.map((method) => (
                  <SelectItem key={method} value={method}>
                    {PAYMENT_METHOD_LABELS[method]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.method ? (
              <p className="text-sm text-destructive">{errors.method.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="edit-payment-paid-at" label="Paid at" hint="Required" />
            <Input
              id="edit-payment-paid-at"
              type="datetime-local"
              {...register("paid_at")}
              aria-invalid={!!errors.paid_at}
            />
            {errors.paid_at ? (
              <p className="text-sm text-destructive">{errors.paid_at.message}</p>
            ) : null}
          </div>
        </form>

        <DialogFooter className="mt-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="edit-payment-form" disabled={!payment}>
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
