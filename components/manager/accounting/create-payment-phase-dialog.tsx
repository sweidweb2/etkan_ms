"use client";

import { useActionState, useEffect, useTransition } from "react";
import { createPaymentPhaseAction } from "@/app/manager/accounting/actions";
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
  createPaymentPhaseSchema,
  type CreatePaymentPhaseInput,
} from "@/lib/validators/manager/create-payment-phase";
import type {
  CreatePaymentPhaseActionState,
  ManagerPaymentPhaseClassOption,
} from "@/types/manager-payment-phase";

const initialState: CreatePaymentPhaseActionState = {};

const defaultValues: CreatePaymentPhaseInput = {
  name: "",
  class_id: "",
  amount: 0,
  upfront_amount: 0,
  duration_months: 1,
  start_date: "",
  end_date: "",
};

type CreatePaymentPhaseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classOptions: ManagerPaymentPhaseClassOption[];
  onCreated: () => void;
};

export function CreatePaymentPhaseDialog({
  open,
  onOpenChange,
  classOptions,
  onCreated,
}: CreatePaymentPhaseDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    createPaymentPhaseAction,
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
    schema: createPaymentPhaseSchema,
    mode: "onBlur",
    defaultValues,
  });

  const selectedClassId = watch("class_id");
  const hasClassOptions = classOptions.length > 0;

  useEffect(() => {
    if (!open) {
      reset(defaultValues);
    }
  }, [open, reset]);

  useActionStateSuccess(state, isPending, () => {
    onOpenChange(false);
    onCreated();
  });

  function onSubmit(values: CreatePaymentPhaseInput) {
    const formData = new FormData();
    formData.set("name", values.name.trim());
    formData.set("class_id", values.class_id);
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
  const classError =
    errors.class_id?.message ?? state.fieldErrors?.class_id?.[0];
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
          <DialogTitle>Create payment phase</DialogTitle>
          <DialogDescription>
            Open a payment phase for a class and assign enrolled students.
          </DialogDescription>
        </DialogHeader>

        <form
          id="create-payment-phase-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="create-payment-phase-name"
              label="Name"
              hint="Required"
            />
            <Input
              id="create-payment-phase-name"
              aria-invalid={!!nameError}
              disabled={isPending}
              {...register("name")}
            />
            {nameError ? (
              <p className="text-sm text-destructive">{nameError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="create-payment-phase-class"
              label="Class"
              hint="Required · semester code required · no opened phase"
            />
            {hasClassOptions ? (
              <Select
                value={selectedClassId || null}
                onValueChange={(value) => {
                  if (!value) {
                    return;
                  }
                  setValue("class_id", value, { shouldValidate: true });
                }}
                disabled={isPending}
              >
                <SelectTrigger
                  id="create-payment-phase-class"
                  className="w-full"
                  aria-invalid={!!classError}
                >
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent align="start">
                  {classOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground">
                No eligible classes. Classes need a semester code and must not
                already have an opened phase.
              </p>
            )}
            {classError ? (
              <p className="text-sm text-destructive">{classError}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="create-payment-phase-amount"
                label="Amount"
                hint="Required"
              />
              <Input
                id="create-payment-phase-amount"
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
                htmlFor="create-payment-phase-upfront"
                label="Upfront amount"
                hint="Required"
              />
              <Input
                id="create-payment-phase-upfront"
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
              htmlFor="create-payment-phase-duration"
              label="Duration (months)"
              hint="Required · at least 1"
            />
            <Input
              id="create-payment-phase-duration"
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
                htmlFor="create-payment-phase-start"
                label="Start date"
                hint="Required"
              />
              <Input
                id="create-payment-phase-start"
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
                htmlFor="create-payment-phase-end"
                label="End date"
                hint="Required · on or after start"
              />
              <Input
                id="create-payment-phase-end"
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
            form="create-payment-phase-form"
            disabled={!hasClassOptions || isPending}
          >
            {isPending ? <InlineSpinner /> : null}
            Create phase
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
