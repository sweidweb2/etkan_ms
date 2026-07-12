"use client";

import { useActionState, useEffect, useTransition } from "react";
import { createScheduledPaymentAction } from "@/app/manager/accounting/actions";
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
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { useZodForm } from "@/hooks/use-zod-form";
import { SCHEDULED_PAYMENT_STATUSES } from "@/lib/constants/manager-scheduled-payment-status";
import { formatAccountCurrency } from "@/lib/constants/manager-subscribed-semester-display";
import { cn } from "@/lib/utils";
import { toDateTimeLocalValue } from "@/lib/utils/datetime-local-value";
import {
  createScheduledPaymentSchema,
  type CreateScheduledPaymentInput,
} from "@/lib/validators/manager/scheduled-payment";
import type { AccountingMutationActionState } from "@/types/manager-accounting";

const initialState: AccountingMutationActionState = {};

const scheduledPaymentFormSchema = createScheduledPaymentSchema.omit({
  subscribed_semester_id: true,
  status: true,
});

type AddScheduledPaymentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscribedSemesterId: string;
  semesterName: string;
  balanceDue: number;
  onScheduledPaymentSaved: () => void;
};

export function AddScheduledPaymentDialog({
  open,
  onOpenChange,
  subscribedSemesterId,
  semesterName,
  balanceDue,
  onScheduledPaymentSaved,
}: AddScheduledPaymentDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    createScheduledPaymentAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;

  useActionStateToast(state, isPending);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useZodForm({
    schema: scheduledPaymentFormSchema,
    mode: "onBlur",
    defaultValues: {
      payment_date: toDateTimeLocalValue(new Date()),
      amount: "",
      note: "",
    },
  });

  useEffect(() => {
    if (!open) {
      reset({
        payment_date: toDateTimeLocalValue(new Date()),
        amount: "",
        note: "",
      });
    }
  }, [open, reset]);

  useEffect(() => {
    if (!state.success) {
      return;
    }

    onOpenChange(false);
    onScheduledPaymentSaved();
  }, [state.success, onOpenChange, onScheduledPaymentSaved]);

  function onSubmit(
    values: Omit<CreateScheduledPaymentInput, "subscribed_semester_id" | "status">
  ) {
    if (
      values.amount !== "" &&
      typeof values.amount === "number" &&
      values.amount > balanceDue
    ) {
      setError("amount", {
        message: `Amount cannot exceed the remaining due (${balanceDue}).`,
      });
      return;
    }

    const formData = new FormData();
    formData.set("subscribed_semester_id", subscribedSemesterId);
    formData.set("payment_date", values.payment_date);
    formData.set("amount", values.amount === "" ? "" : String(values.amount));
    formData.set("status", SCHEDULED_PAYMENT_STATUSES.SCHEDULED);
    formData.set("note", values.note?.trim() ?? "");

    startTransition(() => {
      formAction(formData);
    });
  }

  const paymentDateError =
    errors.payment_date?.message ?? state.fieldErrors?.payment_date?.[0];
  const amountError = errors.amount?.message ?? state.fieldErrors?.amount?.[0];
  const noteError = errors.note?.message ?? state.fieldErrors?.note?.[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule payment reminder</DialogTitle>
          <DialogDescription>
            Create a reminder checkpoint for {semesterName}. Outstanding balance:{" "}
            {formatAccountCurrency(balanceDue)}. This is informational only and
            does not record an actual payment. Status starts as scheduled.
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
              aria-invalid={!!paymentDateError}
            />
            {paymentDateError ? (
              <p className="text-sm text-destructive">{paymentDateError}</p>
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
              max={balanceDue}
              step="0.01"
              placeholder={`Up to ${balanceDue}`}
              {...register("amount")}
              aria-invalid={!!amountError}
            />
            {amountError ? (
              <p className="text-sm text-destructive">{amountError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="add-scheduled-payment-note" label="Note" hint="Optional" />
            <textarea
              id="add-scheduled-payment-note"
              rows={3}
              placeholder="Reminder context for you and the student…"
              aria-invalid={!!noteError}
              className={cn(
                "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
              )}
              {...register("note")}
            />
            {noteError ? (
              <p className="text-sm text-destructive">{noteError}</p>
            ) : null}
          </div>
        </form>

        <DialogFooter className="mt-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="add-scheduled-payment-form" disabled={isPending}>
            {isPending ? <InlineSpinner /> : null}
            Schedule reminder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
