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
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_VALUES,
} from "@/lib/constants/manager-payment-methods";
import { showSuccessToast } from "@/lib/toast";
import { toDateTimeLocalValue } from "@/lib/utils/datetime-local-value";
import {
  addPaymentSchema,
  type AddPaymentInput,
} from "@/lib/validators/manager/add-payment";
import type { ManagerStudentPaymentRow } from "@/types/manager-student-account";

type AddPaymentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscribedSemesterId: string;
  semesterName: string;
  onAddPayment: (payment: ManagerStudentPaymentRow) => void;
};

export function AddPaymentDialog({
  open,
  onOpenChange,
  subscribedSemesterId,
  semesterName,
  onAddPayment,
}: AddPaymentDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AddPaymentInput>({
    resolver: zodResolver(addPaymentSchema),
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
    if (!open) {
      reset({
        amount: 0,
        currency: "USD",
        method: PAYMENT_METHOD_VALUES[0],
        paid_at: toDateTimeLocalValue(new Date()),
      });
    }
  }, [open, reset]);

  function onSubmit(values: AddPaymentInput) {
    onAddPayment({
      id: crypto.randomUUID(),
      subscribed_semester_id: subscribedSemesterId,
      semester_name: semesterName,
      amount: values.amount,
      currency: values.currency,
      method: values.method,
      paid_at: new Date(values.paid_at).toISOString(),
    });
    showSuccessToast("Payment recorded.");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add payment</DialogTitle>
          <DialogDescription>
            Record a payment for {semesterName}. Preview-only until backend is
            connected.
          </DialogDescription>
        </DialogHeader>

        <form
          id="add-payment-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="add-payment-amount" label="Amount" hint="Required" />
            <Input
              id="add-payment-amount"
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
              htmlFor="add-payment-currency"
              label="Currency"
              hint="Required"
            />
            <Input
              id="add-payment-currency"
              {...register("currency")}
              aria-invalid={!!errors.currency}
            />
            {errors.currency ? (
              <p className="text-sm text-destructive">{errors.currency.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="add-payment-method"
              label="Payment method"
              hint="Required"
            />
            <Select
              value={selectedMethod || null}
              onValueChange={(value) => {
                if (!value) {
                  return;
                }

                setValue("method", value as AddPaymentInput["method"], {
                  shouldValidate: true,
                });
              }}
            >
              <SelectTrigger
                id="add-payment-method"
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
            <FieldLabel htmlFor="add-payment-paid-at" label="Paid at" hint="Required" />
            <Input
              id="add-payment-paid-at"
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
          <Button type="submit" form="add-payment-form">
            Add payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
