"use client";

import { useActionState, useState, useTransition } from "react";
import { assignOptionalEnrollPaymentPhasesAction } from "@/app/manager/accounting/actions";
import { FieldLabel } from "@/components/auth/field-label";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import type { AssignOptionalEnrollPaymentPhasesActionState } from "@/types/manager-payment-phase";

const initialState: AssignOptionalEnrollPaymentPhasesActionState = {};

export type OptionalEnrollPaymentPhaseOption = {
  id: string;
  name: string;
};

type OptionalEnrollPaymentPhasesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentLabel: string;
  autoAssignedPhase: OptionalEnrollPaymentPhaseOption;
  optionalPaymentPhases: OptionalEnrollPaymentPhaseOption[];
};

export function OptionalEnrollPaymentPhasesDialog({
  open,
  onOpenChange,
  studentId,
  studentLabel,
  autoAssignedPhase,
  optionalPaymentPhases,
}: OptionalEnrollPaymentPhasesDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    assignOptionalEnrollPaymentPhasesAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;
  const handleOpenChange = usePendingAwareOpenChange(isPending, onOpenChange);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectionResetToken = open ? studentId : null;
  const [prevSelectionResetToken, setPrevSelectionResetToken] =
    useState(selectionResetToken);

  if (selectionResetToken !== prevSelectionResetToken) {
    setPrevSelectionResetToken(selectionResetToken);
    if (selectionResetToken !== null) {
      setSelectedIds([]);
    }
  }

  useActionStateToast(state, isPending);
  useActionStateSuccess(state, isPending, () => {
    onOpenChange(false);
  });

  function togglePhase(phaseId: string, checked: boolean) {
    setSelectedIds((current) => {
      if (checked) {
        return current.includes(phaseId) ? current : [...current, phaseId];
      }
      return current.filter((id) => id !== phaseId);
    });
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedIds.length === 0) {
      return;
    }

    const formData = new FormData();
    formData.set("student_id", studentId);
    for (const id of selectedIds) {
      formData.append("payment_phase_ids", id);
    }

    startTransition(() => {
      formAction(formData);
    });
  }

  const phaseError = state.fieldErrors?.payment_phase_ids?.[0];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Also assign other payment phases?</DialogTitle>
          <DialogDescription>
            {studentLabel} was added to{" "}
            <span className="font-medium text-foreground">
              {autoAssignedPhase.name}
            </span>
            . Optionally assign them to other opened phases for this semester.
          </DialogDescription>
        </DialogHeader>

        <form
          id="optional-enroll-payment-phases-form"
          onSubmit={onSubmit}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor={
                optionalPaymentPhases[0]
                  ? `optional-enroll-phase-${optionalPaymentPhases[0].id}`
                  : "optional-enroll-phases"
              }
              label="Additional payment phases"
              hint="Optional"
            />
            <ul className="flex flex-col gap-2">
              {optionalPaymentPhases.map((phase) => {
                const checked = selectedIds.includes(phase.id);
                const checkboxId = `optional-enroll-phase-${phase.id}`;
                return (
                  <li
                    key={phase.id}
                    className="flex items-center gap-3 rounded-md border px-3 py-2"
                  >
                    <Checkbox
                      id={checkboxId}
                      checked={checked}
                      disabled={isPending}
                      onCheckedChange={(next) => togglePhase(phase.id, next)}
                      aria-label={phase.name}
                    />
                    <label
                      htmlFor={checkboxId}
                      className="cursor-pointer text-sm font-medium leading-none"
                    >
                      {phase.name}
                    </label>
                  </li>
                );
              })}
            </ul>
            {phaseError ? (
              <p className="text-sm text-destructive">{phaseError}</p>
            ) : null}
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Skip
          </Button>
          <Button
            type="submit"
            form="optional-enroll-payment-phases-form"
            disabled={isPending || selectedIds.length === 0}
          >
            {isPending ? <InlineSpinner /> : null}
            Assign selected
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
