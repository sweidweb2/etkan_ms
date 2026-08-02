"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { repairMissingSppAction } from "@/app/manager/accounting/actions";
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
  ManagerMissingSppRow,
  ManagerPaymentPhaseRow,
  RepairMissingSppActionState,
} from "@/types/manager-payment-phase";

const initialState: RepairMissingSppActionState = {};

type AssignablePhaseOption = {
  id: string;
  label: string;
};

type AssignMissingSppDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: ManagerMissingSppRow | null;
  phases: ManagerPaymentPhaseRow[];
};

function buildAssignablePhaseOptions(
  phases: ManagerPaymentPhaseRow[]
): AssignablePhaseOption[] {
  return phases
    .filter(
      (phase) =>
        phase.status === PAYMENT_PHASE_STATUSES.OPENED ||
        phase.status === PAYMENT_PHASE_STATUSES.CLOSED
    )
    .map((phase) => ({
      id: phase.id,
      label: `${phase.name} · ${phase.semester_name} · ${PAYMENT_PHASE_STATUS_LABELS[phase.status]}`,
    }));
}

export function AssignMissingSppDialog({
  open,
  onOpenChange,
  row,
  phases,
}: AssignMissingSppDialogProps) {
  const router = useRouter();
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    repairMissingSppAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;
  const handleOpenChange = usePendingAwareOpenChange(isPending, onOpenChange);

  const phaseOptions = useMemo(
    () => buildAssignablePhaseOptions(phases),
    [phases]
  );
  const phaseSelectItems = useMemo(
    () =>
      phaseOptions.map((option) => ({
        value: option.id,
        label: option.label,
      })),
    [phaseOptions]
  );

  const defaultPhaseId = useMemo(() => {
    if (!row) {
      return "";
    }
    if (phaseOptions.some((option) => option.id === row.payment_phase_id)) {
      return row.payment_phase_id;
    }
    return phaseOptions[0]?.id ?? "";
  }, [row, phaseOptions]);

  const [selectedPhaseId, setSelectedPhaseId] = useState(defaultPhaseId);
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
    if (!row || !selectedPhaseId) {
      return;
    }

    const formData = new FormData();
    formData.set("payment_phase_id", selectedPhaseId);
    formData.set("student_id", row.student_id);

    startTransition(() => {
      formAction(formData);
    });
  }

  const phaseError = state.fieldErrors?.payment_phase_id?.[0];
  const hasPhaseOptions = phaseOptions.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Assign payment phase</DialogTitle>
          <DialogDescription>
            Create a student payment phase for{" "}
            <span className="font-medium text-foreground">
              {row?.student_label ?? "this student"}
            </span>
            . Closed phases reopen if the new assignment is unpaid.
          </DialogDescription>
        </DialogHeader>

        <form
          id="assign-missing-spp-form"
          onSubmit={onSubmit}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="assign-missing-spp-phase"
              label="Payment phase"
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
                  id="assign-missing-spp-phase"
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
                No opened or closed payment phases available.
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
            form="assign-missing-spp-form"
            disabled={!hasPhaseOptions || !selectedPhaseId || isPending}
          >
            {isPending ? <InlineSpinner /> : null}
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
