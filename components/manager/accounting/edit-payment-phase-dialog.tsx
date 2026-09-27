"use client";

import { useEffect, useTransition } from "react";
import { useFormActionState as useActionState } from "@/hooks/use-form-action-state";
import { updatePaymentPhaseAction } from "@/app/manager/accounting/actions";
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
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { useZodForm } from "@/hooks/use-zod-form";
import {
  updatePaymentPhaseSchema,
  type UpdatePaymentPhaseInput,
} from "@/lib/validators/manager/update-payment-phase";
import type {
  ManagerPaymentPhaseRow,
  UpdatePaymentPhaseActionState,
} from "@/types/manager-payment-phase";

const initialState: UpdatePaymentPhaseActionState = {};

type EditPaymentPhaseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phase: ManagerPaymentPhaseRow;
  onUpdated: (phase: ManagerPaymentPhaseRow) => void;
};

export function EditPaymentPhaseDialog({
  open,
  onOpenChange,
  phase,
  onUpdated,
}: EditPaymentPhaseDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    updatePaymentPhaseAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;

  const handleOpenChange = usePendingAwareOpenChange(isPending, onOpenChange);

  useActionStateToast(state, isPending);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useZodForm({
    schema: updatePaymentPhaseSchema,
    mode: "onBlur",
    defaultValues: {
      id: phase.id,
      name: phase.name,
      amount: phase.amount,
      upfront_amount: phase.upfront_amount,
      duration_months: phase.duration_months,
      start_date: phase.start_date,
      end_date: phase.end_date,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        id: phase.id,
        name: phase.name,
        amount: phase.amount,
        upfront_amount: phase.upfront_amount,
        duration_months: phase.duration_months,
        start_date: phase.start_date,
        end_date: phase.end_date,
      });
    }
  }, [open, reset, phase]);

  useActionStateSuccess(state, isPending, (nextState) => {
    if (nextState.phase) {
      onUpdated(nextState.phase);
    }
    onOpenChange(false);
  });

  function onSubmit(values: UpdatePaymentPhaseInput) {
    const formData = new FormData();
    formData.set("id", phase.id);
    formData.set("name", values.name.trim());
    formData.set("amount", String(values.amount));
    formData.set("upfront_amount", String(values.upfront_amount));
    formData.set("duration_months", String(values.duration_months));
    formData.set("start_date", values.start_date);
    formData.set("end_date", values.end_date);

    startTransition(() => {
      formAction(formData);
    });
  }

  const nameError = errors.name?.message ?? state.fieldErrors?.name?.[0];
  const amountError = errors.amount?.message ?? state.fieldErrors?.amount?.[0];
  const upfrontError =
    errors.upfront_amount?.message ?? state.fieldErrors?.upfront_amount?.[0];
  const durationError =
    errors.duration_months?.message ?? state.fieldErrors?.duration_months?.[0];
  const startDateError =
    errors.start_date?.message ?? state.fieldErrors?.start_date?.[0];
  const endDateError =
    errors.end_date?.message ?? state.fieldErrors?.end_date?.[0];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Edit payment phase</DialogTitle>
          <DialogDescription>
            Update phase details. Amount changes recalculate student balances.
          </DialogDescription>
        </DialogHeader>

        <form
          id="edit-payment-phase-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-payment-phase-name"
              label="Name"
              hint="Required"
            />
            <Input
              id="edit-payment-phase-name"
              aria-invalid={!!nameError}
              disabled={isPending}
              {...register("name")}
            />
            {nameError ? (
              <p className="text-sm text-destructive">{nameError}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="edit-payment-phase-amount"
                label="Amount"
                hint="Required"
              />
              <Input
                id="edit-payment-phase-amount"
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

            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="edit-payment-phase-upfront"
                label="Upfront amount"
                hint="Required"
              />
              <Input
                id="edit-payment-phase-upfront"
                type="number"
                min={0}
                step={0.01}
                aria-invalid={!!upfrontError}
                disabled={isPending}
                {...register("upfront_amount")}
              />
              {upfrontError ? (
                <p className="text-sm text-destructive">{upfrontError}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-payment-phase-duration"
              label="Duration (months)"
              hint="Required · at least 1"
            />
            <Input
              id="edit-payment-phase-duration"
              type="number"
              min={1}
              step={1}
              aria-invalid={!!durationError}
              disabled={isPending}
              {...register("duration_months")}
            />
            {durationError ? (
              <p className="text-sm text-destructive">{durationError}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="edit-payment-phase-start"
                label="Start date"
                hint="Required"
              />
              <Input
                id="edit-payment-phase-start"
                type="date"
                aria-invalid={!!startDateError}
                disabled={isPending}
                {...register("start_date")}
              />
              {startDateError ? (
                <p className="text-sm text-destructive">{startDateError}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="edit-payment-phase-end"
                label="End date"
                hint="Required · on or after start"
              />
              <Input
                id="edit-payment-phase-end"
                type="date"
                aria-invalid={!!endDateError}
                disabled={isPending}
                {...register("end_date")}
              />
              {endDateError ? (
                <p className="text-sm text-destructive">{endDateError}</p>
              ) : null}
            </div>
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
            form="edit-payment-phase-form"
            disabled={isPending}
          >
            {isPending ? <InlineSpinner /> : null}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
