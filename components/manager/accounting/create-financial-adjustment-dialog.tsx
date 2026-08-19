"use client";

import { useActionState, useEffect, useTransition } from "react";
import { createFinancialAdjustmentAction } from "@/app/manager/accounting/actions";
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
  FINANCIAL_ADJUSTMENT_TYPES,
  FINANCIAL_ADJUSTMENT_TYPE_LABELS,
  FINANCIAL_ADJUSTMENT_TYPE_VALUES,
  FINANCIAL_ADJUSTMENT_VALUE_TYPES,
  FINANCIAL_ADJUSTMENT_VALUE_TYPE_LABELS,
  FINANCIAL_ADJUSTMENT_VALUE_TYPE_VALUES,
} from "@/lib/manager/accounting/constants";
import {
  createFinancialAdjustmentSchema,
  type CreateFinancialAdjustmentInput,
} from "@/lib/validators/manager/create-financial-adjustment";
import type {
  CreateFinancialAdjustmentActionState,
  ManagerFinancialAdjustmentRow,
} from "@/types/manager-financial-adjustment";

const initialState: CreateFinancialAdjustmentActionState = {};

type CreateFinancialAdjustmentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sppId: string;
  onCreated: (adjustment: ManagerFinancialAdjustmentRow) => void;
};

export function CreateFinancialAdjustmentDialog({
  open,
  onOpenChange,
  sppId,
  onCreated,
}: CreateFinancialAdjustmentDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    createFinancialAdjustmentAction,
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
    schema: createFinancialAdjustmentSchema,
    mode: "onBlur",
    defaultValues: {
      student_payment_phase_id: sppId,
      type: FINANCIAL_ADJUSTMENT_TYPES.DISCOUNT,
      value_type: FINANCIAL_ADJUSTMENT_VALUE_TYPES.FIXED,
      value: 0,
      reason: "",
      effective_date: "",
    },
  });

  const selectedType = watch("type");
  const selectedValueType = watch("value_type");
  const typeSelectItems = FINANCIAL_ADJUSTMENT_TYPE_VALUES.map((type) => ({
    value: type,
    label: FINANCIAL_ADJUSTMENT_TYPE_LABELS[type],
  }));
  const valueTypeSelectItems = FINANCIAL_ADJUSTMENT_VALUE_TYPE_VALUES.map(
    (valueType) => ({
      value: valueType,
      label: FINANCIAL_ADJUSTMENT_VALUE_TYPE_LABELS[valueType],
    })
  );

  useEffect(() => {
    if (open) {
      reset({
        student_payment_phase_id: sppId,
        type: FINANCIAL_ADJUSTMENT_TYPES.DISCOUNT,
        value_type: FINANCIAL_ADJUSTMENT_VALUE_TYPES.FIXED,
        value: 0,
        reason: "",
        effective_date: new Date().toISOString().slice(0, 10),
      });
    }
  }, [open, reset, sppId]);

  useActionStateSuccess(state, isPending, (nextState) => {
    onOpenChange(false);
    if (nextState.adjustment) {
      onCreated(nextState.adjustment);
    }
  });

  function onSubmit(values: CreateFinancialAdjustmentInput) {
    const formData = new FormData();
    formData.set("student_payment_phase_id", sppId);
    formData.set("type", values.type);
    formData.set("value_type", values.value_type);
    formData.set("value", String(values.value));
    formData.set("reason", values.reason?.trim() ?? "");
    formData.set("effective_date", values.effective_date);
    startTransition(() => formAction(formData));
  }

  const typeError = errors.type?.message ?? state.fieldErrors?.type?.[0];
  const valueTypeError =
    errors.value_type?.message ?? state.fieldErrors?.value_type?.[0];
  const valueError = errors.value?.message ?? state.fieldErrors?.value?.[0];
  const dateError =
    errors.effective_date?.message ?? state.fieldErrors?.effective_date?.[0];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Add financial adjustment</DialogTitle>
          <DialogDescription>
            Apply one discount, scholarship, or manual adjustment to this
            student.
          </DialogDescription>
        </DialogHeader>

        <form
          id="create-financial-adjustment-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-2">
              <FieldLabel htmlFor="create-adj-type" label="Type" hint="Required" />
              <Select
                value={selectedType}
                items={typeSelectItems}
                onValueChange={(value) => {
                  if (!value) return;
                  setValue("type", value as CreateFinancialAdjustmentInput["type"], {
                    shouldValidate: true,
                  });
                }}
                disabled={isPending}
              >
                <SelectTrigger
                  id="create-adj-type"
                  className="w-full"
                  aria-invalid={!!typeError}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FINANCIAL_ADJUSTMENT_TYPE_VALUES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {FINANCIAL_ADJUSTMENT_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {typeError ? (
                <p className="text-sm text-destructive">{typeError}</p>
              ) : null}
            </div>

            <div className="flex min-w-0 flex-col gap-2">
              <FieldLabel
                htmlFor="create-adj-value-type"
                label="Value type"
                hint="Required"
              />
              <Select
                value={selectedValueType}
                items={valueTypeSelectItems}
                onValueChange={(value) => {
                  if (!value) return;
                  setValue(
                    "value_type",
                    value as CreateFinancialAdjustmentInput["value_type"],
                    { shouldValidate: true }
                  );
                }}
                disabled={isPending}
              >
                <SelectTrigger
                  id="create-adj-value-type"
                  className="w-full"
                  aria-invalid={!!valueTypeError}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FINANCIAL_ADJUSTMENT_VALUE_TYPE_VALUES.map((valueType) => (
                    <SelectItem key={valueType} value={valueType}>
                      {FINANCIAL_ADJUSTMENT_VALUE_TYPE_LABELS[valueType]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {valueTypeError ? (
                <p className="text-sm text-destructive">{valueTypeError}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="create-adj-value"
              label="Value"
              hint={
                selectedValueType ===
                FINANCIAL_ADJUSTMENT_VALUE_TYPES.PERCENTAGE
                  ? "Required · 0–100"
                  : "Required"
              }
            />
            <Input
              id="create-adj-value"
              type="number"
              min={0}
              max={
                selectedValueType ===
                FINANCIAL_ADJUSTMENT_VALUE_TYPES.PERCENTAGE
                  ? 100
                  : undefined
              }
              step={0.01}
              aria-invalid={!!valueError}
              disabled={isPending}
              {...register("value")}
            />
            {valueError ? (
              <p className="text-sm text-destructive">{valueError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="create-adj-date"
              label="Effective date"
              hint="Required"
            />
            <Input
              id="create-adj-date"
              type="date"
              aria-invalid={!!dateError}
              disabled={isPending}
              {...register("effective_date")}
            />
            {dateError ? (
              <p className="text-sm text-destructive">{dateError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="create-adj-reason"
              label="Reason"
              hint="Optional"
            />
            <Input
              id="create-adj-reason"
              disabled={isPending}
              {...register("reason")}
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
            form="create-financial-adjustment-form"
            disabled={isPending}
          >
            {isPending ? <InlineSpinner /> : null}
            Create adjustment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
