"use client";

import { useActionState, useEffect, useTransition } from "react";
import { updatePaymentAction } from "@/app/manager/accounting/actions";
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
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { useZodForm } from "@/hooks/use-zod-form";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_VALUES,
} from "@/lib/constants/manager-payment-methods";
import { toDateTimeLocalValue } from "@/lib/utils/datetime-local-value";
import {
  addPaymentSchema,
  type AddPaymentInput,
} from "@/lib/validators/manager/add-payment";
import type { AccountingMutationActionState } from "@/types/manager-accounting";
import type { ManagerStudentPaymentRow } from "@/types/manager-student-account";

const initialState: AccountingMutationActionState = {};

type EditPaymentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: ManagerStudentPaymentRow | null;
  onPaymentSaved: () => void;
};

export function EditPaymentDialog({
  open,
  onOpenChange,
  payment,
  onPaymentSaved,
}: EditPaymentDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    updatePaymentAction,
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
    schema: addPaymentSchema,
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
      method: (payment.method ?? PAYMENT_METHOD_VALUES[0]) as AddPaymentInput["method"],
      paid_at: toDateTimeLocalValue(new Date(payment.paid_at)),
    });
  }, [open, payment, reset]);

  useEffect(() => {
    if (!state.success) {
      return;
    }

    onOpenChange(false);
    onPaymentSaved();
  }, [state.success, onOpenChange, onPaymentSaved]);

  function onSubmit(values: AddPaymentInput) {
    if (!payment) {
      return;
    }

    const formData = new FormData();
    formData.set("id", payment.id);
    formData.set("amount", String(values.amount));
    formData.set("currency", values.currency.trim());
    formData.set("method", values.method);
    formData.set("paid_at", values.paid_at);

    startTransition(() => {
      formAction(formData);
    });
  }

  const amountError = errors.amount?.message ?? state.fieldErrors?.amount?.[0];
  const currencyError =
    errors.currency?.message ?? state.fieldErrors?.currency?.[0];
  const methodError = errors.method?.message ?? state.fieldErrors?.method?.[0];
  const paidAtError = errors.paid_at?.message ?? state.fieldErrors?.paid_at?.[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit payment</DialogTitle>
          <DialogDescription>
            Update payment details for {payment?.semester_name ?? "this subscription"}.
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
              aria-invalid={!!amountError}
            />
            {amountError ? (
              <p className="text-sm text-destructive">{amountError}</p>
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
              aria-invalid={!!currencyError}
            />
            {currencyError ? (
              <p className="text-sm text-destructive">{currencyError}</p>
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

                setValue("method", value as AddPaymentInput["method"], {
                  shouldValidate: true,
                });
              }}
            >
              <SelectTrigger
                id="edit-payment-method"
                className="w-full"
                aria-invalid={!!methodError}
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
            {methodError ? (
              <p className="text-sm text-destructive">{methodError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="edit-payment-paid-at" label="Paid at" hint="Required" />
            <Input
              id="edit-payment-paid-at"
              type="datetime-local"
              {...register("paid_at")}
              aria-invalid={!!paidAtError}
            />
            {paidAtError ? (
              <p className="text-sm text-destructive">{paidAtError}</p>
            ) : null}
          </div>
        </form>

        <DialogFooter className="mt-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-payment-form"
            disabled={!payment || isPending}
          >
            {isPending ? <InlineSpinner /> : null}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
