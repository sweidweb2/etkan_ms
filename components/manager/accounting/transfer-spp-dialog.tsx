"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { transferSppAction } from "@/app/manager/accounting/actions";
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
import { PAYMENT_PHASE_STATUS_LABELS } from "@/lib/constants/manager-payment-phase-display";
import { PAYMENT_PHASE_STATUSES } from "@/lib/manager/accounting/constants";
import type {
  ManagerPaymentPhaseRow,
  ManagerSppRow,
  TransferSppActionState,
} from "@/types/manager-payment-phase";

const initialState: TransferSppActionState = {};

type AssignablePhaseOption = {
  id: string;
  label: string;
};

type TransferSppDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spp: ManagerSppRow | null;
  sourcePhaseId: string;
  phases: ManagerPaymentPhaseRow[];
};

function buildDestinationPhaseOptions(
  phases: ManagerPaymentPhaseRow[],
  sourcePhaseId: string
): AssignablePhaseOption[] {
  return phases
    .filter(
      (phase) =>
        phase.id !== sourcePhaseId &&
        (phase.status === PAYMENT_PHASE_STATUSES.OPENED ||
          phase.status === PAYMENT_PHASE_STATUSES.CLOSED)
    )
    .map((phase) => ({
      id: phase.id,
      label: `${phase.name} · ${phase.semester_name} · ${PAYMENT_PHASE_STATUS_LABELS[phase.status]}`,
    }));
}

export function TransferSppDialog({
  open,
  onOpenChange,
  spp,
  sourcePhaseId,
  phases,
}: TransferSppDialogProps) {
  const router = useRouter();
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    transferSppAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;
  const handleOpenChange = usePendingAwareOpenChange(isPending, onOpenChange);

  const phaseOptions = useMemo(
    () => buildDestinationPhaseOptions(phases, sourcePhaseId),
    [phases, sourcePhaseId]
  );
  const phaseSelectItems = useMemo(
    () =>
      phaseOptions.map((option) => ({
        value: option.id,
        label: option.label,
      })),
    [phaseOptions]
  );

  const [selectedPhaseId, setSelectedPhaseId] = useState(
    phaseOptions[0]?.id ?? ""
  );
  const defaultPhaseId = phaseOptions[0]?.id ?? "";
  const selectionResetToken = open ? defaultPhaseId : null;
  const [prevSelectionResetToken, setPrevSelectionResetToken] =
    useState(selectionResetToken);

  if (selectionResetToken !== prevSelectionResetToken) {
    setPrevSelectionResetToken(selectionResetToken);
    if (selectionResetToken !== null) {
      setSelectedPhaseId(defaultPhaseId);
    }
  }

  useActionStateToast(state, isPending);
  useActionStateSuccess(state, isPending, () => {
    onOpenChange(false);
    router.refresh();
  });

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!spp || !selectedPhaseId) {
      return;
    }

    const formData = new FormData();
    formData.set("spp_id", spp.id);
    formData.set("destination_payment_phase_id", selectedPhaseId);

    startTransition(() => {
      formAction(formData);
    });
  }

  const phaseError = state.fieldErrors?.destination_payment_phase_id?.[0];
  const hasPhaseOptions = phaseOptions.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Transfer payment phase</DialogTitle>
          <DialogDescription>
            Move the billing record for{" "}
            <span className="font-medium text-foreground">
              {spp?.student_label ?? "this student"}
            </span>{" "}
            to another payment phase. Payments and adjustments stay attached.
            Both phases are recalculated after the move.
          </DialogDescription>
        </DialogHeader>

        <form
          id="transfer-spp-form"
          onSubmit={onSubmit}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="transfer-spp-phase"
              label="Destination phase"
              hint="Required · opened or closed"
            />
            {hasPhaseOptions ? (
              <Select
                value={selectedPhaseId || null}
                items={phaseSelectItems}
                onValueChange={(value) => {
                  if (!value) {
                    return;
                  }
                  setSelectedPhaseId(value);
                }}
                disabled={isPending}
              >
                <SelectTrigger
                  id="transfer-spp-phase"
                  className="w-full"
                  aria-invalid={!!phaseError}
                >
                  <SelectValue placeholder="Select a payment phase" />
                </SelectTrigger>
                <SelectContent align="start">
                  {phaseOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground">
                No other opened or closed payment phases available.
              </p>
            )}
            {phaseError ? (
              <p className="text-sm text-destructive">{phaseError}</p>
            ) : null}
            {state.error && !phaseError ? (
              <p className="text-sm text-destructive">{state.error}</p>
            ) : null}
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
            form="transfer-spp-form"
            disabled={!hasPhaseOptions || !selectedPhaseId || isPending}
          >
            {isPending ? <InlineSpinner /> : null}
            Transfer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
