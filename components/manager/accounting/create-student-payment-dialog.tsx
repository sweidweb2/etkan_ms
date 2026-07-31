"use client";

import { useActionState, useEffect, useTransition } from "react";
import { createStudentPaymentAction } from "@/app/manager/accounting/actions";
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
  PAYMENT_METHODS,
} from "@/lib/manager/accounting/constants";
import {
  createStudentPaymentSchema,
  type CreateStudentPaymentInput,
} from "@/lib/validators/manager/create-student-payment";
import type { CreateStudentPaymentActionState } from "@/types/manager-student-payment";

const initialState: CreateStudentPaymentActionState = {};

type CreateStudentPaymentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sppId: string;
  defaultReceivedBy: string;
  onCreated: () => void;
};

export function CreateStudentPaymentDialog({
  open,
  onOpenChange,
  sppId,
  defaultReceivedBy,
  onCreated,
}: CreateStudentPaymentDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    createStudentPaymentAction,
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
    schema: createStudentPaymentSchema,
    mode: "onBlur",
    defaultValues: {
      student_payment_phase_id: sppId,
      payment_date: "",
      amount: 0,
      payment_method: PAYMENT_METHODS.CASH,
      received_by: defaultReceivedBy,
      received_by_management: true,
      receipt_number: "",
      notes: "",
    },
  });

  const selectedMethod = watch("payment_method");
  const receivedByManagement = watch("received_by_management");
  const paymentMethodSelectItems = PAYMENT_METHOD_VALUES.map((method) => ({
    value: method,
    label: PAYMENT_METHOD_LABELS[method],
  }));

  useEffect(() => {
    if (open) {
      reset({
        student_payment_phase_id: sppId,
        payment_date: new Date().toISOString().slice(0, 10),
        amount: 0,
        payment_method: PAYMENT_METHODS.CASH,
        received_by: defaultReceivedBy,
        received_by_management: true,
        receipt_number: "",
        notes: "",
      });
    }
  }, [open, reset, sppId, defaultReceivedBy]);

  useActionStateSuccess(state, isPending, () => {
    onOpenChange(false);
    onCreated();
  });

  function onSubmit(values: CreateStudentPaymentInput) {
    const formData = new FormData();
    formData.set("student_payment_phase_id", sppId);
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
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>
            Add a payment against this student payment phase.
          </DialogDescription>
        </DialogHeader>

        <form
          id="create-student-payment-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="create-payment-date"
                label="Payment date"
                hint="Required"
              />
              <Input
                id="create-payment-date"
                type="date"
                aria-invalid={!!dateError}
                disabled={isPending}
                {...register("payment_date")}
              />
              {dateError ? (
                <p className="text-sm text-destructive">{dateError}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="create-payment-amount"
                label="Amount"
                hint="Required"
              />
              <Input
                id="create-payment-amount"
                type="number"
                min={0}
                step={0.01}
                aria-invalid={!!amountError}
                disabled={isPending}
                {...register("amount")}
              />
              {amountError ? (
                <p className="text-sm text-destructive">{amountError}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="create-payment-method"
              label="Payment method"
              hint="Required"
            />
            <Select
              value={selectedMethod}
              items={paymentMethodSelectItems}
              onValueChange={(value) => {
                if (!value) return;
                setValue("payment_method", value as CreateStudentPaymentInput["payment_method"], {
                  shouldValidate: true,
                });
              }}
              disabled={isPending}
            >
              <SelectTrigger
                id="create-payment-method"
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
              htmlFor="create-payment-received-by"
              label="Received by"
              hint="Required"
            />
            <Input
              id="create-payment-received-by"
              aria-invalid={!!receivedByError}
              disabled={isPending}
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
              disabled={isPending}
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
              htmlFor="create-payment-receipt"
              label="Receipt number"
              hint="Optional"
            />
            <Input
              id="create-payment-receipt"
              disabled={isPending}
              {...register("receipt_number")}
            />
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="create-payment-notes"
              label="Notes"
              hint="Optional"
            />
            <Input
              id="create-payment-notes"
              disabled={isPending}
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
            form="create-student-payment-form"
            disabled={isPending}
          >
            {isPending ? <InlineSpinner /> : null}
            Record payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
