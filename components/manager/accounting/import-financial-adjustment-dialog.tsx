"use client";

import { useState, useTransition } from "react";
import { useFormActionState as useActionState } from "@/hooks/use-form-action-state";
import { format } from "date-fns";
import { importFinancialAdjustmentAction } from "@/app/manager/accounting/actions";
import { PaymentPhaseStatusBadge } from "@/components/manager/accounting/payment-phase-status-badge";
import { SppStatusBadge } from "@/components/manager/accounting/spp-status-badge";
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
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { formatPaymentPhaseMoney } from "@/lib/constants/manager-payment-phase-display";
import {
  FINANCIAL_ADJUSTMENT_TYPE_LABELS,
  FINANCIAL_ADJUSTMENT_VALUE_TYPES,
  type FinancialAdjustmentType,
  type FinancialAdjustmentValueType,
  type PaymentPhaseStatus,
  type StudentPaymentPhaseStatus,
} from "@/lib/manager/accounting/constants";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import type {
  ImportFinancialAdjustmentActionState,
  ManagerFinancialAdjustmentRow,
  ManagerImportableAdjustmentRow,
} from "@/types/manager-financial-adjustment";

const initialState: ImportFinancialAdjustmentActionState = {};

type ImportFinancialAdjustmentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sppId: string;
  candidates: ManagerImportableAdjustmentRow[];
  isLoadingCandidates?: boolean;
  onImported: (adjustment: ManagerFinancialAdjustmentRow) => void;
};

function formatAdjustmentValue(
  valueType: FinancialAdjustmentValueType,
  value: number
) {
  if (valueType === FINANCIAL_ADJUSTMENT_VALUE_TYPES.PERCENTAGE) {
    return `${value}%`;
  }
  return formatPaymentPhaseMoney(value);
}

export function ImportFinancialAdjustmentDialog({
  open,
  onOpenChange,
  sppId,
  candidates,
  isLoadingCandidates = false,
  onImported,
}: ImportFinancialAdjustmentDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    importFinancialAdjustmentAction,
    initialState
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(open);
  const isPending = isActionPending || isTransitionPending;
  const handleOpenChange = usePendingAwareOpenChange(isPending, onOpenChange);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setSelectedId(null);
    }
  }

  useActionStateToast(state, isPending);

  useActionStateSuccess(state, isPending, (nextState) => {
    onOpenChange(false);
    if (nextState.adjustment) {
      onImported(nextState.adjustment);
    }
  });

  function handleApply() {
    if (!selectedId) {
      return;
    }
    const formData = new FormData();
    formData.set("target_student_payment_phase_id", sppId);
    formData.set("source_adjustment_id", selectedId);
    startTransition(() => {
      formAction(formData);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-lg"
        showCloseButton={!isPending}
      >
        <DialogHeader>
          <DialogTitle>Import adjustment</DialogTitle>
          <DialogDescription>
            Choose a prior adjustment for this student from another payment
            phase. Type, value, and reason are copied; effective date is set to
            today.
          </DialogDescription>
        </DialogHeader>

        {isLoadingCandidates ? (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-10 text-sm text-muted-foreground">
            <InlineSpinner />
            Loading prior adjustments…
          </div>
        ) : candidates.length === 0 ? (
          <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            No prior adjustments for this student.
          </p>
        ) : (
          <div
            className="flex max-h-80 flex-col gap-2 overflow-y-auto pr-1"
            role="listbox"
            aria-label="Prior adjustments"
          >
            {candidates.map((candidate) => {
              const isSelected = selectedId === candidate.id;
              const reasonDisplay = candidate.reason
                ? truncateText(candidate.reason, 80).display
                : null;

              return (
                <button
                  key={candidate.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={isPending}
                  onClick={() => setSelectedId(candidate.id)}
                  className={cn(
                    "rounded-lg border px-3 py-2.5 text-left transition-colors",
                    "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    "disabled:cursor-not-allowed disabled:opacity-60",
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border bg-card"
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">
                      {candidate.payment_phase_name}
                    </p>
                    <PaymentPhaseStatusBadge
                      status={
                        candidate.payment_phase_status as PaymentPhaseStatus
                      }
                    />
                    <SppStatusBadge
                      status={
                        candidate.source_spp_status as StudentPaymentPhaseStatus
                      }
                    />
                  </div>
                  <p className="mt-1.5 text-sm">
                    {
                      FINANCIAL_ADJUSTMENT_TYPE_LABELS[
                        candidate.type as FinancialAdjustmentType
                      ]
                    }
                    {" · "}
                    <span className="tabular-nums">
                      {formatAdjustmentValue(
                        candidate.value_type as FinancialAdjustmentValueType,
                        candidate.value
                      )}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Effective{" "}
                    {format(
                      new Date(candidate.effective_date),
                      "MMM d, yyyy"
                    )}
                    {reasonDisplay ? ` · ${reasonDisplay}` : ""}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {state.error && !state.fieldErrors ? (
          <p className="text-sm text-destructive">{state.error}</p>
        ) : null}

        <DialogFooter className="sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            disabled={
              isPending ||
              isLoadingCandidates ||
              !selectedId ||
              candidates.length === 0
            }
          >
            {isPending ? <InlineSpinner /> : null}
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
