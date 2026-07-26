"use client";

import { useActionState, useEffect, useTransition } from "react";
import { updateAccountSpecialCaseAction } from "@/app/manager/accounting/actions";
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
  ACCOUNT_SPECIAL_CASE_TYPE_LABELS,
  ACCOUNT_SPECIAL_CASE_TYPE_VALUES,
  computeSpecialCasePercentageDiscount,
} from "@/lib/constants/manager-account-special-case";
import { cn } from "@/lib/utils";
import {
  accountSpecialCaseFieldsSchema,
  type AccountSpecialCaseFieldsInput,
} from "@/lib/validators/manager/account-special-case";
import type { AccountingMutationActionState } from "@/types/manager-accounting";
import type { ManagerAccountSpecialCaseRow } from "@/types/manager-account-special-case";

const initialState: AccountingMutationActionState = {};

type EditAccountSpecialCaseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  specialCase: ManagerAccountSpecialCaseRow | null;
  semesterAmount: number;
  onSpecialCaseSaved: () => void;
};

export function EditAccountSpecialCaseDialog({
  open,
  onOpenChange,
  specialCase,
  semesterAmount,
  onSpecialCaseSaved,
}: EditAccountSpecialCaseDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    updateAccountSpecialCaseAction,
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
      case_type: ACCOUNT_SPECIAL_CASE_TYPE_VALUES[0],
      status: ACCOUNT_SPECIAL_CASE_STATUS_VALUES[0],
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
    if (!open || !specialCase) {
      return;
    }

    reset({
      total_amount: specialCase.total_amount,
      explanation: specialCase.explanation,
      case_type: specialCase.case_type,
      status: specialCase.status,
    });
  }, [open, reset, specialCase]);

  useActionStateSuccess(state, isPending, () => {
    onOpenChange(false);
    onSpecialCaseSaved();
  });

  function onSubmit(values: AccountSpecialCaseFieldsInput) {
    if (!specialCase) {
      return;
    }

    const formData = new FormData();
    formData.set("id", specialCase.id);
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
          <DialogTitle>Edit special case</DialogTitle>
          <DialogDescription>
            Update special billing terms
            {specialCase ? ` for ${specialCase.semester_name}` : ""}. Discount %
            is calculated from the semester amount.
          </DialogDescription>
        </DialogHeader>

        <form
          id="edit-account-special-case-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-special-case-type"
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
                id="edit-special-case-type"
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
              htmlFor="edit-special-case-status"
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
                id="edit-special-case-status"
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
              htmlFor="edit-special-case-total"
              label="Total amount"
              hint="Required"
            />
            <Input
              id="edit-special-case-total"
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
              htmlFor="edit-special-case-explanation"
              label="Explanation"
              hint="Required"
            />
            <textarea
              id="edit-special-case-explanation"
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
            form="edit-account-special-case-form"
            disabled={isPending || !specialCase}
          >
            {isPending ? <InlineSpinner /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
