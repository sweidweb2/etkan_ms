"use client";

import { useTransition } from "react";
import { useFormActionState as useActionState } from "@/hooks/use-form-action-state";
import { bulkDeleteSppClearancesAction } from "@/app/manager/accounting/actions";
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
import type { BulkDeleteSppClearancesActionState } from "@/types/manager-spp-clearance";

const initialState: BulkDeleteSppClearancesActionState = {};

type BulkDeleteSppClearancesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentPhaseId: string;
  markerCount: number;
  onDeleted: () => void;
};

export function BulkDeleteSppClearancesDialog({
  open,
  onOpenChange,
  paymentPhaseId,
  markerCount,
  onDeleted,
}: BulkDeleteSppClearancesDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    bulkDeleteSppClearancesAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;
  const handleOpenChange = usePendingAwareOpenChange(isPending, onOpenChange);

  useActionStateToast(state, isPending);
  useActionStateSuccess(state, isPending, () => {
    onOpenChange(false);
    onDeleted();
  });

  function handleConfirm() {
    const formData = new FormData();
    formData.set("payment_phase_id", paymentPhaseId);
    startTransition(() => {
      formAction(formData);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Bulk remove Month paid</DialogTitle>
          <DialogDescription>
            Remove Month paid markers for{" "}
            {markerCount === 1
              ? "1 student"
              : `${markerCount} students`}{" "}
            on this phase? Balances are unchanged.
          </DialogDescription>
        </DialogHeader>
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
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? <InlineSpinner /> : null}
            Remove
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
