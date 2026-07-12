"use client";

import { useActionState, useEffect, useTransition } from "react";
import { updateScheduledPaymentAction } from "@/app/manager/accounting/actions";
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
import { MANAGER_SCHEDULED_PAYMENT_STATUS_LABELS } from "@/lib/constants/manager-scheduled-payment-display";
import {
  SCHEDULED_PAYMENT_STATUSES,
  type ScheduledPaymentStatusValue,
} from "@/lib/constants/manager-scheduled-payment-status";
import { cn } from "@/lib/utils";
import { toDateTimeLocalValue } from "@/lib/utils/datetime-local-value";
import {
  updateScheduledPaymentSchema,
  type UpdateScheduledPaymentInput,
} from "@/lib/validators/manager/scheduled-payment";
import type { AccountingMutationActionState } from "@/types/manager-accounting";
import type { ManagerScheduledPaymentRow } from "@/types/manager-scheduled-payment";

const initialState: AccountingMutationActionState = {};

const scheduledPaymentFormSchema = updateScheduledPaymentSchema.omit({ id: true });

type EditScheduledPaymentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduledPayment: ManagerScheduledPaymentRow | null;
  remainingDue: number;
  onScheduledPaymentSaved: () => void;
};

export function EditScheduledPaymentDialog({
  open,
  onOpenChange,
  scheduledPayment,
  remainingDue,
  onScheduledPaymentSaved,
}: EditScheduledPaymentDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    updateScheduledPaymentAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;

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
    schema: scheduledPaymentFormSchema,
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

  useActionStateSuccess(state, isPending, () => {
    onOpenChange(false);
    onScheduledPaymentSaved();
  });

  function onSubmit(values: Omit<UpdateScheduledPaymentInput, "id">) {
    if (!scheduledPayment) {
      return;
    }

    if (
      values.amount !== "" &&
      typeof values.amount === "number" &&
      values.amount > remainingDue
    ) {
      setError("amount", {
        message: `Amount cannot exceed the remaining due (${remainingDue}).`,
      });
      return;
    }

    const formData = new FormData();
    formData.set("id", scheduledPayment.id);
    formData.set("payment_date", values.payment_date);
    formData.set("amount", values.amount === "" ? "" : String(values.amount));
    formData.set("status", values.status);
    formData.set("note", values.note?.trim() ?? "");

    startTransition(() => {
      formAction(formData);
    });
  }

  const paymentDateError =
    errors.payment_date?.message ?? state.fieldErrors?.payment_date?.[0];
  const amountError = errors.amount?.message ?? state.fieldErrors?.amount?.[0];
  const statusError = errors.status?.message ?? state.fieldErrors?.status?.[0];
  const noteError = errors.note?.message ?? state.fieldErrors?.note?.[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit scheduled payment</DialogTitle>
          <DialogDescription>
            Update this payment reminder checkpoint.
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
              aria-invalid={!!paymentDateError}
            />
            {paymentDateError ? (
              <p className="text-sm text-destructive">{paymentDateError}</p>
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
              max={remainingDue}
              step="0.01"
              placeholder={`Up to ${remainingDue}`}
              {...register("amount")}
              aria-invalid={!!amountError}
            />
            {amountError ? (
              <p className="text-sm text-destructive">{amountError}</p>
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

                setValue("status", value as ScheduledPaymentStatusValue, {
                  shouldValidate: true,
                });
              }}
            >
              <SelectTrigger
                id="edit-scheduled-payment-status"
                className="w-full"
                aria-invalid={!!statusError}
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
            {statusError ? (
              <p className="text-sm text-destructive">{statusError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="edit-scheduled-payment-note" label="Note" hint="Optional" />
            <textarea
              id="edit-scheduled-payment-note"
              rows={3}
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
          <Button
            type="submit"
            form="edit-scheduled-payment-form"
            disabled={!scheduledPayment || isPending}
          >
            {isPending ? <InlineSpinner /> : null}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
