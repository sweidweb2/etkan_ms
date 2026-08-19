"use client";

import { useActionState, useEffect, useTransition } from "react";
import { updateWorkshopPaymentAction } from "@/app/manager/workshops/actions";
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
  WORKSHOP_PAYMENT_METHOD_LABELS,
  WORKSHOP_PAYMENT_METHOD_VALUES,
  WORKSHOP_PAYMENT_TYPE_LABELS,
  WORKSHOP_PAYMENT_TYPE_VALUES,
  WORKSHOP_PAYMENT_TYPES,
} from "@/lib/constants/manager-workshop-display";
import { WORKSHOP_FIELD_LIMITS } from "@/lib/constants/workshop-field-limits";
import { cn } from "@/lib/utils";
import {
  updateWorkshopPaymentSchema,
  type UpdateWorkshopPaymentInput,
} from "@/lib/validators/manager/workshop-payment";
import type {
  ManagerWorkshopPaymentRow,
  UpdateWorkshopPaymentActionState,
} from "@/types/manager-workshop";

const textareaClassName = cn(
  "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
);

const NONE_METHOD = "__none__";
const initialState: UpdateWorkshopPaymentActionState = {};

type EditWorkshopPaymentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: ManagerWorkshopPaymentRow | null;
  onUpdated: (payment: ManagerWorkshopPaymentRow) => void;
};

function toFormDefaults(
  payment: ManagerWorkshopPaymentRow | null
): UpdateWorkshopPaymentInput {
  return {
    id: payment?.id ?? "",
    workshop_id: payment?.workshop_id ?? "",
    amount: payment?.amount ?? 0,
    type: payment?.type ?? WORKSHOP_PAYMENT_TYPES.CREDIT,
    payment_date: payment?.payment_date ?? "",
    payment_method:
      (payment?.payment_method as UpdateWorkshopPaymentInput["payment_method"]) ??
      null,
    notes: payment?.notes ?? null,
  };
}

export function EditWorkshopPaymentDialog({
  open,
  onOpenChange,
  payment,
  onUpdated,
}: EditWorkshopPaymentDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    updateWorkshopPaymentAction,
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
    schema: updateWorkshopPaymentSchema,
    mode: "onBlur",
    defaultValues: toFormDefaults(payment),
  });

  const type = watch("type");
  const paymentMethod = watch("payment_method");

  useEffect(() => {
    if (open) {
      reset(toFormDefaults(payment));
    }
  }, [open, payment, reset]);

  useActionStateSuccess(state, isPending, (nextState) => {
    if (nextState.payment) {
      onUpdated(nextState.payment);
    }
    onOpenChange(false);
  });

  function onSubmit(values: UpdateWorkshopPaymentInput) {
    const formData = new FormData();
    formData.set("id", values.id);
    formData.set("workshop_id", values.workshop_id);
    formData.set("amount", String(values.amount));
    formData.set("type", values.type);
    formData.set("payment_date", values.payment_date);
    formData.set("payment_method", values.payment_method ?? "");
    formData.set("notes", values.notes ?? "");

    startTransition(() => {
      formAction(formData);
    });
  }

  const amountError = errors.amount?.message ?? state.fieldErrors?.amount?.[0];
  const typeError = errors.type?.message ?? state.fieldErrors?.type?.[0];
  const dateError =
    errors.payment_date?.message ?? state.fieldErrors?.payment_date?.[0];
  const methodError =
    errors.payment_method?.message ?? state.fieldErrors?.payment_method?.[0];
  const notesError = errors.notes?.message ?? state.fieldErrors?.notes?.[0];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Edit payment</DialogTitle>
          <DialogDescription>
            Update this ledger entry. Workshop association stays fixed.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <input type="hidden" {...register("id")} />
          <input type="hidden" {...register("workshop_id")} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="edit-workshop-payment-type"
                label="Type"
                hint="Required"
              />
              <Select
                value={type}
                onValueChange={(value) =>
                  setValue(
                    "type",
                    value as UpdateWorkshopPaymentInput["type"],
                    { shouldValidate: true }
                  )
                }
                disabled={isPending}
              >
                <SelectTrigger
                  id="edit-workshop-payment-type"
                  aria-invalid={Boolean(typeError)}
                  className="w-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORKSHOP_PAYMENT_TYPE_VALUES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {WORKSHOP_PAYMENT_TYPE_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {typeError ? (
                <p className="text-sm text-destructive">{typeError}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="edit-workshop-payment-amount"
                label="Amount"
                hint="Required"
              />
              <Input
                id="edit-workshop-payment-amount"
                type="number"
                step="0.01"
                min={WORKSHOP_FIELD_LIMITS.payment_amount.min}
                max={WORKSHOP_FIELD_LIMITS.payment_amount.max}
                disabled={isPending}
                aria-invalid={Boolean(amountError)}
                {...register("amount")}
              />
              {amountError ? (
                <p className="text-sm text-destructive">{amountError}</p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="edit-workshop-payment-date"
                label="Payment date"
                hint="Required"
              />
              <Input
                id="edit-workshop-payment-date"
                type="date"
                disabled={isPending}
                aria-invalid={Boolean(dateError)}
                {...register("payment_date")}
              />
              {dateError ? (
                <p className="text-sm text-destructive">{dateError}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="edit-workshop-payment-method"
                label="Payment method"
                hint="Optional"
              />
              <Select
                value={paymentMethod ?? NONE_METHOD}
                onValueChange={(value) =>
                  setValue(
                    "payment_method",
                    value === NONE_METHOD
                      ? null
                      : (value as NonNullable<
                          UpdateWorkshopPaymentInput["payment_method"]
                        >),
                    { shouldValidate: true }
                  )
                }
                disabled={isPending}
              >
                <SelectTrigger
                  id="edit-workshop-payment-method"
                  aria-invalid={Boolean(methodError)}
                  className="w-full"
                >
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_METHOD}>None</SelectItem>
                  {WORKSHOP_PAYMENT_METHOD_VALUES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {WORKSHOP_PAYMENT_METHOD_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {methodError ? (
                <p className="text-sm text-destructive">{methodError}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-workshop-payment-notes"
              label="Notes"
              hint="Optional"
            />
            <textarea
              id="edit-workshop-payment-notes"
              rows={3}
              maxLength={WORKSHOP_FIELD_LIMITS.payment_notes.max}
              disabled={isPending}
              className={textareaClassName}
              aria-invalid={Boolean(notesError)}
              {...register("notes")}
            />
            {notesError ? (
              <p className="text-sm text-destructive">{notesError}</p>
            ) : null}
          </div>

          {state.error && !state.fieldErrors ? (
            <p className="text-sm text-destructive">{state.error}</p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !payment}>
              {isPending ? <InlineSpinner /> : null}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
