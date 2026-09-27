"use client";

import { useEffect, useTransition } from "react";
import { useFormActionState as useActionState } from "@/hooks/use-form-action-state";
import { updateTransactionAction } from "@/app/manager/income-statement/actions";
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
  TRANSACTION_CATEGORIES,
  TRANSACTION_CATEGORY_LABELS,
  TRANSACTION_TYPE_LABELS,
  TRANSACTION_TYPE_VALUES,
  getTransactionCategoriesForType,
  type PaymentMethod,
  type TransactionCategory,
  type TransactionType,
} from "@/lib/manager/accounting/constants";
import {
  createTransactionFormSchema,
  type CreateTransactionFormValues,
} from "@/lib/validators/manager/create-transaction";
import type {
  ManagerIncomeTransactionRow,
  UpdateTransactionActionState,
} from "@/types/manager-income-statement";

const initialState: UpdateTransactionActionState = {};
const EMPTY_PAYMENT_METHOD = "__none__";

function transactionToFormValues(
  transaction: ManagerIncomeTransactionRow
): CreateTransactionFormValues {
  const presets = getTransactionCategoriesForType(
    transaction.type
  ) as readonly string[];
  const isPreset = presets.includes(transaction.category);

  return {
    transaction_date: transaction.transaction_date,
    type: transaction.type,
    amount: transaction.amount,
    description: transaction.description,
    category: isPreset
      ? (transaction.category as TransactionCategory)
      : TRANSACTION_CATEGORIES.OTHER,
    category_custom: isPreset ? "" : transaction.category,
    payment_method: transaction.payment_method ?? EMPTY_PAYMENT_METHOD,
    recorded_by: transaction.recorded_by,
    notes: transaction.notes ?? "",
  };
}

type EditTransactionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: ManagerIncomeTransactionRow | null;
};

export function EditTransactionDialog({
  open,
  onOpenChange,
  transaction,
}: EditTransactionDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    updateTransactionAction,
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
    schema: createTransactionFormSchema,
    mode: "onBlur",
    defaultValues: transaction
      ? transactionToFormValues(transaction)
      : {
          transaction_date: "",
          type: TRANSACTION_TYPE_VALUES[0],
          amount: 0,
          description: "",
          category: TRANSACTION_CATEGORIES.DONATION,
          category_custom: "",
          payment_method: EMPTY_PAYMENT_METHOD,
          recorded_by: "",
          notes: "",
        },
  });

  const selectedType = watch("type") as TransactionType;
  const selectedCategory = watch("category");
  const selectedMethod = watch("payment_method") || EMPTY_PAYMENT_METHOD;
  const categoryOptions = getTransactionCategoriesForType(selectedType);
  const isOtherCategory = selectedCategory === TRANSACTION_CATEGORIES.OTHER;

  useEffect(() => {
    if (open && transaction) {
      reset(transactionToFormValues(transaction));
    }
  }, [open, transaction, reset]);

  useActionStateSuccess(state, isPending, () => {
    onOpenChange(false);
  });

  function onSubmit(values: CreateTransactionFormValues) {
    if (!transaction) return;

    const formData = new FormData();
    formData.set("id", transaction.id);
    formData.set("transaction_date", values.transaction_date);
    formData.set("type", values.type);
    formData.set("amount", String(values.amount));
    formData.set("description", values.description);
    formData.set("category", values.category);
    formData.set("category_custom", values.category_custom ?? "");
    formData.set(
      "payment_method",
      values.payment_method === EMPTY_PAYMENT_METHOD
        ? ""
        : (values.payment_method ?? "")
    );
    formData.set("recorded_by", values.recorded_by);
    formData.set("notes", values.notes ?? "");

    startTransition(() => {
      formAction(formData);
    });
  }

  const typeError = errors.type?.message ?? state.fieldErrors?.type?.[0];
  const dateError =
    errors.transaction_date?.message ??
    state.fieldErrors?.transaction_date?.[0];
  const amountError = errors.amount?.message ?? state.fieldErrors?.amount?.[0];
  const descriptionError =
    errors.description?.message ?? state.fieldErrors?.description?.[0];
  const categoryError =
    errors.category?.message ?? state.fieldErrors?.category?.[0];
  const categoryCustomError =
    errors.category_custom?.message ??
    state.fieldErrors?.category_custom?.[0];
  const recordedByError =
    errors.recorded_by?.message ?? state.fieldErrors?.recorded_by?.[0];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={!isPending} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit transaction</DialogTitle>
          <DialogDescription>
            Update this external credit or debit.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <FieldLabel
                htmlFor="edit-transaction-type"
                label="Type"
                hint="Required"
              />
              <Select
                value={selectedType}
                onValueChange={(value) => {
                  const nextType = value as TransactionType;
                  const nextCategories =
                    getTransactionCategoriesForType(nextType);
                  setValue("type", nextType, { shouldValidate: true });
                  setValue("category", nextCategories[0], {
                    shouldValidate: true,
                  });
                  setValue("category_custom", "", { shouldValidate: true });
                }}
                disabled={isPending}
              >
                <SelectTrigger id="edit-transaction-type" className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {TRANSACTION_TYPE_VALUES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {TRANSACTION_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {typeError ? (
                <p className="text-sm text-destructive">{typeError}</p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <FieldLabel
                htmlFor="edit-transaction-date"
                label="Date"
                hint="Required"
              />
              <Input
                id="edit-transaction-date"
                type="date"
                disabled={isPending}
                {...register("transaction_date")}
              />
              {dateError ? (
                <p className="text-sm text-destructive">{dateError}</p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <FieldLabel
                htmlFor="edit-transaction-amount"
                label="Amount"
                hint="Required"
              />
              <Input
                id="edit-transaction-amount"
                type="number"
                step="0.01"
                min="0.01"
                disabled={isPending}
                {...register("amount")}
              />
              {amountError ? (
                <p className="text-sm text-destructive">{amountError}</p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <FieldLabel
                htmlFor="edit-transaction-category"
                label="Category"
                hint="Required"
              />
              <Select
                value={selectedCategory}
                onValueChange={(value) => {
                  setValue("category", value as TransactionCategory, {
                    shouldValidate: true,
                  });
                  if (value !== TRANSACTION_CATEGORIES.OTHER) {
                    setValue("category_custom", "", { shouldValidate: true });
                  }
                }}
                disabled={isPending}
              >
                <SelectTrigger id="edit-transaction-category" className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((category) => (
                    <SelectItem key={category} value={category}>
                      {TRANSACTION_CATEGORY_LABELS[category]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {categoryError ? (
                <p className="text-sm text-destructive">{categoryError}</p>
              ) : null}
            </div>
          </div>

          {isOtherCategory ? (
            <div className="grid gap-2">
              <FieldLabel
                htmlFor="edit-transaction-category-custom"
                label="Custom category"
                hint="Required"
              />
              <Input
                id="edit-transaction-category-custom"
                placeholder="Enter category"
                disabled={isPending}
                {...register("category_custom")}
              />
              {categoryCustomError ? (
                <p className="text-sm text-destructive">{categoryCustomError}</p>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-2">
            <FieldLabel
              htmlFor="edit-transaction-description"
              label="Description"
              hint="Required"
            />
            <Input
              id="edit-transaction-description"
              disabled={isPending}
              {...register("description")}
            />
            {descriptionError ? (
              <p className="text-sm text-destructive">{descriptionError}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <FieldLabel
                htmlFor="edit-transaction-method"
                label="Payment method"
                hint="Optional"
              />
              <Select
                value={selectedMethod}
                onValueChange={(value) =>
                  setValue(
                    "payment_method",
                    value as PaymentMethod | typeof EMPTY_PAYMENT_METHOD,
                    { shouldValidate: true }
                  )
                }
                disabled={isPending}
              >
                <SelectTrigger id="edit-transaction-method" className="w-full">
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EMPTY_PAYMENT_METHOD}>None</SelectItem>
                  {PAYMENT_METHOD_VALUES.map((method) => (
                    <SelectItem key={method} value={method}>
                      {PAYMENT_METHOD_LABELS[method]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <FieldLabel
                htmlFor="edit-transaction-recorded-by"
                label="Recorded by"
                hint="Required"
              />
              <Input
                id="edit-transaction-recorded-by"
                disabled={isPending}
                {...register("recorded_by")}
              />
              {recordedByError ? (
                <p className="text-sm text-destructive">{recordedByError}</p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-2">
            <FieldLabel
              htmlFor="edit-transaction-notes"
              label="Notes"
              hint="Optional"
            />
            <Input
              id="edit-transaction-notes"
              placeholder="Optional"
              disabled={isPending}
              {...register("notes")}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <InlineSpinner /> : null}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
