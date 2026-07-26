"use client";

import { useActionState, useEffect, useTransition } from "react";
import { createPaymentAction } from "@/app/manager/accounting/actions";
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
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { useZodForm } from "@/hooks/use-zod-form";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_VALUES,
} from "@/lib/constants/manager-payment-methods";
import { formatAccountCurrency } from "@/lib/constants/manager-subscribed-semester-display";
import { toDateTimeLocalValue } from "@/lib/utils/datetime-local-value";
import {
  addPaymentSchema,
  type AddPaymentInput,
} from "@/lib/validators/manager/add-payment";
import type { AccountingMutationActionState } from "@/types/manager-accounting";

const initialState: AccountingMutationActionState = {};

type AddPaymentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscribedSemesterId: string;
  semesterName: string;
  remainingDue: number;
  owedAmount: number;
  onPaymentSaved: () => void;
};

export function AddPaymentDialog({
  open,
  onOpenChange,
  subscribedSemesterId,
  semesterName,
  remainingDue,
  owedAmount,
  onPaymentSaved,
}: AddPaymentDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    createPaymentAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;

  const handleOpenChange = usePendingAwareOpenChange(isPending, onOpenChange);

  useActionStateToast(state, isPending);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
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
  const totalPaid = Math.max(
    Math.round((owedAmount - remainingDue) * 100) / 100,
    0
  );

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

  useActionStateSuccess(state, isPending, () => {
    onOpenChange(false);
    onPaymentSaved();
  });

  function onSubmit(values: AddPaymentInput) {
    if (values.amount > remainingDue) {
      setError("amount", {
        message: `Amount cannot exceed the remaining due (${remainingDue}).`,
      });
      return;
    }

    const formData = new FormData();
    formData.set("subscribed_semester_id", subscribedSemesterId);
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Add payment</DialogTitle>
          <DialogDescription>
            Record a payment for {semesterName}.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
          <p className="text-muted-foreground">
            Owed {formatAccountCurrency(owedAmount)} · Paid{" "}
            {formatAccountCurrency(totalPaid)} · Remaining{" "}
            {formatAccountCurrency(remainingDue)}
          </p>
        </div>

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
              max={remainingDue}
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
              htmlFor="add-payment-currency"
              label="Currency"
              hint="Required"
            />
            <Input
              id="add-payment-currency"
              {...register("currency")}
              aria-invalid={!!currencyError}
            />
            {currencyError ? (
              <p className="text-sm text-destructive">{currencyError}</p>
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
            <FieldLabel htmlFor="add-payment-paid-at" label="Paid at" hint="Required" />
            <Input
              id="add-payment-paid-at"
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
          <Button type="button" variant="outline" disabled={isPending} onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="add-payment-form" disabled={isPending}>
            {isPending ? <InlineSpinner /> : null}
            Add payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
