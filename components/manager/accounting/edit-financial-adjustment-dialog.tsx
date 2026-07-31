"use client";

import { useActionState, useEffect, useTransition } from "react";
import { updateFinancialAdjustmentAction } from "@/app/manager/accounting/actions";
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
  FINANCIAL_ADJUSTMENT_TYPE_LABELS,
  FINANCIAL_ADJUSTMENT_TYPE_VALUES,
  FINANCIAL_ADJUSTMENT_VALUE_TYPES,
  FINANCIAL_ADJUSTMENT_VALUE_TYPE_LABELS,
  FINANCIAL_ADJUSTMENT_VALUE_TYPE_VALUES,
} from "@/lib/manager/accounting/constants";
import {
  updateFinancialAdjustmentSchema,
  type UpdateFinancialAdjustmentInput,
} from "@/lib/validators/manager/create-financial-adjustment";
import type {
  ManagerFinancialAdjustmentRow,
  UpdateFinancialAdjustmentActionState,
} from "@/types/manager-financial-adjustment";

const initialState: UpdateFinancialAdjustmentActionState = {};

type EditFinancialAdjustmentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adjustment: ManagerFinancialAdjustmentRow | null;
  onUpdated: () => void;
};

export function EditFinancialAdjustmentDialog({
  open,
  onOpenChange,
  adjustment,
  onUpdated,
}: EditFinancialAdjustmentDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    updateFinancialAdjustmentAction,
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
    schema: updateFinancialAdjustmentSchema,
    mode: "onBlur",
    defaultValues: {
      id: adjustment?.id ?? "",
      student_payment_phase_id: adjustment?.student_payment_phase_id ?? "",
      type: adjustment?.type ?? "discount",
      value_type: adjustment?.value_type ?? "fixed",
      value: adjustment?.value ?? 0,
      reason: adjustment?.reason ?? "",
      effective_date: adjustment?.effective_date ?? "",
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
    if (open && adjustment) {
      reset({
        id: adjustment.id,
        student_payment_phase_id: adjustment.student_payment_phase_id,
        type: adjustment.type,
        value_type: adjustment.value_type,
        value: adjustment.value,
        reason: adjustment.reason ?? "",
        effective_date: adjustment.effective_date,
      });
    }
  }, [open, adjustment, reset]);

  useActionStateSuccess(state, isPending, () => {
    onOpenChange(false);
    onUpdated();
  });

  function onSubmit(values: UpdateFinancialAdjustmentInput) {
    if (!adjustment) return;
    const formData = new FormData();
    formData.set("id", adjustment.id);
    formData.set("student_payment_phase_id", adjustment.student_payment_phase_id);
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
          <DialogTitle>Edit financial adjustment</DialogTitle>
          <DialogDescription>
            Update the adjustment. Balances recalculate automatically.
          </DialogDescription>
        </DialogHeader>

        <form
          id="edit-financial-adjustment-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="edit-adj-type" label="Type" hint="Required" />
            <Select
              value={selectedType}
              items={typeSelectItems}
              onValueChange={(value) => {
                if (!value) return;
                setValue("type", value as UpdateFinancialAdjustmentInput["type"], {
                  shouldValidate: true,
                });
              }}
              disabled={isPending || !adjustment}
            >
              <SelectTrigger id="edit-adj-type" aria-invalid={!!typeError}>
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="edit-adj-value-type"
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
                    value as UpdateFinancialAdjustmentInput["value_type"],
                    { shouldValidate: true }
                  );
                }}
                disabled={isPending || !adjustment}
              >
                <SelectTrigger
                  id="edit-adj-value-type"
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

            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="edit-adj-value"
                label="Value"
                hint={
                  selectedValueType ===
                  FINANCIAL_ADJUSTMENT_VALUE_TYPES.PERCENTAGE
                    ? "Required · 0–100"
                    : "Required"
                }
              />
              <Input
                id="edit-adj-value"
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
                disabled={isPending || !adjustment}
                {...register("value")}
              />
              {valueError ? (
                <p className="text-sm text-destructive">{valueError}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-adj-date"
              label="Effective date"
              hint="Required"
            />
            <Input
              id="edit-adj-date"
              type="date"
              aria-invalid={!!dateError}
              disabled={isPending || !adjustment}
              {...register("effective_date")}
            />
            {dateError ? (
              <p className="text-sm text-destructive">{dateError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-adj-reason"
              label="Reason"
              hint="Optional"
            />
            <Input
              id="edit-adj-reason"
              disabled={isPending || !adjustment}
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
            form="edit-financial-adjustment-form"
            disabled={isPending || !adjustment}
          >
            {isPending ? <InlineSpinner /> : null}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
