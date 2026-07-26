"use client";

import { useActionState, useEffect, useTransition } from "react";
import { createAccountSpecialCaseAction } from "@/app/manager/accounting/actions";
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
  ACCOUNT_SPECIAL_CASE_STATUS_LABELS,
  ACCOUNT_SPECIAL_CASE_STATUS_VALUES,
  ACCOUNT_SPECIAL_CASE_STATUSES,
  ACCOUNT_SPECIAL_CASE_TYPE_LABELS,
  ACCOUNT_SPECIAL_CASE_TYPE_VALUES,
  ACCOUNT_SPECIAL_CASE_TYPES,
  computeSpecialCasePercentageDiscount,
} from "@/lib/constants/manager-account-special-case";
import { cn } from "@/lib/utils";
import {
  accountSpecialCaseFieldsSchema,
  type AccountSpecialCaseFieldsInput,
} from "@/lib/validators/manager/account-special-case";
import type { AccountingMutationActionState } from "@/types/manager-accounting";

const initialState: AccountingMutationActionState = {};

type AddAccountSpecialCaseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  semesterId: string;
  semesterName: string;
  semesterAmount: number;
  onSpecialCaseSaved: () => void;
};

export function AddAccountSpecialCaseDialog({
  open,
  onOpenChange,
  accountId,
  semesterId,
  semesterName,
  semesterAmount,
  onSpecialCaseSaved,
}: AddAccountSpecialCaseDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    createAccountSpecialCaseAction,
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
    schema: accountSpecialCaseFieldsSchema,
    mode: "onBlur",
    defaultValues: {
      total_amount: 0,
      explanation: "",
      case_type: ACCOUNT_SPECIAL_CASE_TYPES.SCHOLARSHIP,
      status: ACCOUNT_SPECIAL_CASE_STATUSES.ACTIVE,
    },
  });

  const selectedCaseType = watch("case_type");
  const selectedStatus = watch("status");
  const totalAmount = watch("total_amount");
  const previewDiscount = computeSpecialCasePercentageDiscount(
    semesterAmount,
    Number(totalAmount) || 0
  );

  useEffect(() => {
    if (!open) {
      reset({
        total_amount: 0,
        explanation: "",
        case_type: ACCOUNT_SPECIAL_CASE_TYPES.SCHOLARSHIP,
        status: ACCOUNT_SPECIAL_CASE_STATUSES.ACTIVE,
      });
    }
  }, [open, reset]);

  useActionStateSuccess(state, isPending, () => {
    onOpenChange(false);
    onSpecialCaseSaved();
  });

  function onSubmit(values: AccountSpecialCaseFieldsInput) {
    const formData = new FormData();
    formData.set("account_id", accountId);
    formData.set("semester_id", semesterId);
    formData.set("total_amount", String(values.total_amount));
    formData.set("explanation", values.explanation.trim());
    formData.set("case_type", values.case_type);
    formData.set("status", values.status);

    startTransition(() => {
      formAction(formData);
    });
  }

  const totalAmountError =
    errors.total_amount?.message ?? state.fieldErrors?.total_amount?.[0];
  const explanationError =
    errors.explanation?.message ?? state.fieldErrors?.explanation?.[0];
  const caseTypeError =
    errors.case_type?.message ?? state.fieldErrors?.case_type?.[0];
  const statusError = errors.status?.message ?? state.fieldErrors?.status?.[0];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Add special case</DialogTitle>
          <DialogDescription>
            Record special billing terms for {semesterName}. Discount % is
            calculated from the semester amount.
          </DialogDescription>
        </DialogHeader>

        <form
          id="add-account-special-case-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="add-special-case-type"
              label="Case type"
              hint="Required"
            />
            <Select
              value={selectedCaseType}
              onValueChange={(value) => {
                if (!value) {
                  return;
                }
                setValue(
                  "case_type",
                  value as AccountSpecialCaseFieldsInput["case_type"],
                  { shouldValidate: true }
                );
              }}
            >
              <SelectTrigger
                id="add-special-case-type"
                className="w-full"
                aria-invalid={!!caseTypeError}
              >
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent align="start">
                {ACCOUNT_SPECIAL_CASE_TYPE_VALUES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {ACCOUNT_SPECIAL_CASE_TYPE_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {caseTypeError ? (
              <p className="text-sm text-destructive">{caseTypeError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="add-special-case-status"
              label="Status"
              hint="Required"
            />
            <Select
              value={selectedStatus}
              onValueChange={(value) => {
                if (!value) {
                  return;
                }
                setValue(
                  "status",
                  value as AccountSpecialCaseFieldsInput["status"],
                  { shouldValidate: true }
                );
              }}
            >
              <SelectTrigger
                id="add-special-case-status"
                className="w-full"
                aria-invalid={!!statusError}
              >
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent align="start">
                {ACCOUNT_SPECIAL_CASE_STATUS_VALUES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {ACCOUNT_SPECIAL_CASE_STATUS_LABELS[value]}
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
              htmlFor="add-special-case-total"
              label="Total amount"
              hint="Required"
            />
            <Input
              id="add-special-case-total"
              type="number"
              min="0"
              step="0.01"
              {...register("total_amount")}
              aria-invalid={!!totalAmountError}
            />
            {totalAmountError ? (
              <p className="text-sm text-destructive">{totalAmountError}</p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Calculated discount: {previewDiscount}%
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="add-special-case-explanation"
              label="Explanation"
              hint="Required"
            />
            <textarea
              id="add-special-case-explanation"
              rows={4}
              placeholder="Describe why this special case applies…"
              aria-invalid={!!explanationError}
              className={cn(
                "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
              )}
              {...register("explanation")}
            />
            {explanationError ? (
              <p className="text-sm text-destructive">{explanationError}</p>
            ) : null}
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isPending} onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="add-account-special-case-form"
            disabled={isPending}
          >
            {isPending ? <InlineSpinner /> : null}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
