"use client";

import { useEffect, useTransition } from "react";
import { useFormActionState as useActionState } from "@/hooks/use-form-action-state";
import { createStudentPaymentScheduleAction } from "@/app/manager/accounting/actions";
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
  PAYMENT_SCHEDULE_STATUSES,
  PAYMENT_SCHEDULE_STATUS_LABELS,
  PAYMENT_SCHEDULE_STATUS_VALUES,
} from "@/lib/manager/accounting/constants";
import {
  createStudentPaymentScheduleSchema,
  type CreateStudentPaymentScheduleInput,
} from "@/lib/validators/manager/create-student-payment-schedule";
import type {
  CreateStudentPaymentScheduleActionState,
  ManagerStudentPaymentScheduleRow,
} from "@/types/manager-student-payment-schedule";

const initialState: CreateStudentPaymentScheduleActionState = {};

type CreatePaymentScheduleDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sppId: string;
  paymentPhaseId: string;
  onCreated: (schedule: ManagerStudentPaymentScheduleRow) => void;
};

export function CreatePaymentScheduleDialog({
  open,
  onOpenChange,
  sppId,
  paymentPhaseId,
  onCreated,
}: CreatePaymentScheduleDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    createStudentPaymentScheduleAction,
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
    schema: createStudentPaymentScheduleSchema,
    mode: "onBlur",
    defaultValues: {
      student_payment_phase_id: sppId,
      due_date: "",
      amount: undefined,
      label: "",
      status: PAYMENT_SCHEDULE_STATUSES.PLANNED,
      notes: "",
    },
  });

  const selectedStatus = watch("status");
  const statusSelectItems = PAYMENT_SCHEDULE_STATUS_VALUES.map((status) => ({
    value: status,
    label: PAYMENT_SCHEDULE_STATUS_LABELS[status],
  }));

  useEffect(() => {
    if (open) {
      reset({
        student_payment_phase_id: sppId,
        due_date: new Date().toISOString().slice(0, 10),
        amount: undefined,
        label: "",
        status: PAYMENT_SCHEDULE_STATUSES.PLANNED,
        notes: "",
      });
    }
  }, [open, reset, sppId]);

  useActionStateSuccess(state, isPending, (nextState) => {
    onOpenChange(false);
    if (nextState.schedule) {
      onCreated(nextState.schedule);
    }
  });

  function onSubmit(values: CreateStudentPaymentScheduleInput) {
    const formData = new FormData();
    formData.set("student_payment_phase_id", sppId);
    formData.set("payment_phase_id", paymentPhaseId);
    formData.set("due_date", values.due_date);
    formData.set("amount", String(values.amount));
    formData.set("label", values.label.trim());
    formData.set("status", values.status);
    formData.set("notes", values.notes?.trim() ?? "");

    startTransition(() => {
      formAction(formData);
    });
  }

  const dueDateError =
    errors.due_date?.message ?? state.fieldErrors?.due_date?.[0];
  const amountError = errors.amount?.message ?? state.fieldErrors?.amount?.[0];
  const labelError = errors.label?.message ?? state.fieldErrors?.label?.[0];
  const statusError = errors.status?.message ?? state.fieldErrors?.status?.[0];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Add schedule row</DialogTitle>
          <DialogDescription>
            Add an expected installment for this student payment phase.
          </DialogDescription>
        </DialogHeader>

        <form
          id="create-payment-schedule-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="create-schedule-due-date"
                label="Due date"
                hint="Required"
              />
              <Input
                id="create-schedule-due-date"
                type="date"
                aria-invalid={!!dueDateError}
                disabled={isPending}
                {...register("due_date")}
              />
              {dueDateError ? (
                <p className="text-sm text-destructive">{dueDateError}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="create-schedule-amount"
                label="Amount"
                hint="Required"
              />
              <Input
                id="create-schedule-amount"
                type="number"
                min={0.01}
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
              htmlFor="create-schedule-label"
              label="Label"
              hint="Required"
            />
            <Input
              id="create-schedule-label"
              placeholder="e.g. Upfront, Installment 2"
              aria-invalid={!!labelError}
              disabled={isPending}
              {...register("label")}
            />
            {labelError ? (
              <p className="text-sm text-destructive">{labelError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="create-schedule-status"
              label="Status"
              hint="Required"
            />
            <Select
              value={selectedStatus}
              items={statusSelectItems}
              onValueChange={(value) => {
                if (!value) return;
                setValue(
                  "status",
                  value as CreateStudentPaymentScheduleInput["status"],
                  { shouldValidate: true }
                );
              }}
              disabled={isPending}
            >
              <SelectTrigger
                id="create-schedule-status"
                className="w-full"
                aria-invalid={!!statusError}
              >
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent align="start">
                {PAYMENT_SCHEDULE_STATUS_VALUES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {PAYMENT_SCHEDULE_STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {statusError ? (
              <p className="text-sm text-destructive">{statusError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="create-schedule-notes"
              label="Notes"
              hint="Optional"
            />
            <Input
              id="create-schedule-notes"
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
            form="create-payment-schedule-form"
            disabled={isPending}
          >
            {isPending ? <InlineSpinner /> : null}
            Add row
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
