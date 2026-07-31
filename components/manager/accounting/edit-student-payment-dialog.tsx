"use client";

import { useActionState, useEffect, useTransition } from "react";
import { updateStudentPaymentAction } from "@/app/manager/accounting/actions";
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
} from "@/lib/manager/accounting/constants";
import {
  updateStudentPaymentSchema,
  type UpdateStudentPaymentInput,
} from "@/lib/validators/manager/update-student-payment";
import type {
  ManagerStudentPaymentRow,
  UpdateStudentPaymentActionState,
} from "@/types/manager-student-payment";

const initialState: UpdateStudentPaymentActionState = {};

type EditStudentPaymentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: ManagerStudentPaymentRow | null;
  onUpdated: () => void;
};

export function EditStudentPaymentDialog({
  open,
  onOpenChange,
  payment,
  onUpdated,
}: EditStudentPaymentDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    updateStudentPaymentAction,
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
    watch,
    formState: { errors },
  } = useZodForm({
    schema: updateStudentPaymentSchema,
    mode: "onBlur",
    defaultValues: {
      id: payment?.id ?? "",
      student_payment_phase_id: payment?.student_payment_phase_id ?? "",
      payment_date: payment?.payment_date ?? "",
      amount: payment?.amount ?? 0,
      payment_method: payment?.payment_method ?? "cash",
      received_by: payment?.received_by ?? "",
      received_by_management: payment?.received_by_management ?? true,
      receipt_number: payment?.receipt_number ?? "",
      notes: payment?.notes ?? "",
    },
  });

  const selectedMethod = watch("payment_method");
  const receivedByManagement = watch("received_by_management");
  const paymentMethodSelectItems = PAYMENT_METHOD_VALUES.map((method) => ({
    value: method,
    label: PAYMENT_METHOD_LABELS[method],
  }));

  useEffect(() => {
    if (open && payment) {
      reset({
        id: payment.id,
        student_payment_phase_id: payment.student_payment_phase_id,
        payment_date: payment.payment_date,
        amount: payment.amount,
        payment_method: payment.payment_method,
        received_by: payment.received_by,
        received_by_management: payment.received_by_management,
        receipt_number: payment.receipt_number ?? "",
        notes: payment.notes ?? "",
      });
    }
  }, [open, payment, reset]);

  useActionStateSuccess(state, isPending, () => {
    onOpenChange(false);
    onUpdated();
  });

  function onSubmit(values: UpdateStudentPaymentInput) {
    if (!payment) return;

    const formData = new FormData();
    formData.set("id", payment.id);
    formData.set("student_payment_phase_id", payment.student_payment_phase_id);
    formData.set("payment_date", values.payment_date);
    formData.set("amount", String(values.amount));
    formData.set("payment_method", values.payment_method);
    formData.set("received_by", values.received_by.trim());
    formData.set(
      "received_by_management",
      values.received_by_management ? "true" : "false"
    );
    formData.set("receipt_number", values.receipt_number?.trim() ?? "");
    formData.set("notes", values.notes?.trim() ?? "");

    startTransition(() => {
      formAction(formData);
    });
  }

  const dateError =
    errors.payment_date?.message ?? state.fieldErrors?.payment_date?.[0];
  const amountError =
    errors.amount?.message ?? state.fieldErrors?.amount?.[0];
  const methodError =
    errors.payment_method?.message ?? state.fieldErrors?.payment_method?.[0];
  const receivedByError =
    errors.received_by?.message ?? state.fieldErrors?.received_by?.[0];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Edit payment</DialogTitle>
          <DialogDescription>
            Update payment details. Balances recalculate automatically.
          </DialogDescription>
        </DialogHeader>

        <form
          id="edit-student-payment-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="edit-payment-date"
                label="Payment date"
                hint="Required"
              />
              <Input
                id="edit-payment-date"
                type="date"
                aria-invalid={!!dateError}
                disabled={isPending || !payment}
                {...register("payment_date")}
              />
              {dateError ? (
                <p className="text-sm text-destructive">{dateError}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="edit-payment-amount"
                label="Amount"
                hint="Required"
              />
              <Input
                id="edit-payment-amount"
                type="number"
                min={0}
                step={0.01}
                aria-invalid={!!amountError}
                disabled={isPending || !payment}
                {...register("amount")}
              />
              {amountError ? (
                <p className="text-sm text-destructive">{amountError}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-payment-method"
              label="Payment method"
              hint="Required"
            />
            <Select
              value={selectedMethod}
              items={paymentMethodSelectItems}
              onValueChange={(value) => {
                if (!value) return;
                setValue(
                  "payment_method",
                  value as UpdateStudentPaymentInput["payment_method"],
                  { shouldValidate: true }
                );
              }}
              disabled={isPending || !payment}
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
            <FieldLabel
              htmlFor="edit-payment-received-by"
              label="Received by"
              hint="Required"
            />
            <Input
              id="edit-payment-received-by"
              aria-invalid={!!receivedByError}
              disabled={isPending || !payment}
              {...register("received_by")}
            />
            {receivedByError ? (
              <p className="text-sm text-destructive">{receivedByError}</p>
            ) : null}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={receivedByManagement}
              disabled={isPending || !payment}
              onChange={(event) =>
                setValue("received_by_management", event.target.checked, {
                  shouldValidate: true,
                })
              }
            />
            Confirmed by management
          </label>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-payment-receipt"
              label="Receipt number"
              hint="Optional"
            />
            <Input
              id="edit-payment-receipt"
              disabled={isPending || !payment}
              {...register("receipt_number")}
            />
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-payment-notes"
              label="Notes"
              hint="Optional"
            />
            <Input
              id="edit-payment-notes"
              disabled={isPending || !payment}
              {...register("notes")}
            />
          </div>
        </form>

        <DialogFooter className="mt-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-student-payment-form"
            disabled={isPending || !payment}
          >
            {isPending ? <InlineSpinner /> : null}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
