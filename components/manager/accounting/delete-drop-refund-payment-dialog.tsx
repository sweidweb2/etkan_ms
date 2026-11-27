"use client";

import { useRouter } from "next/navigation";
import { deleteDropRefundPaymentAction } from "@/app/manager/accounting/actions";
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
import { useMutationDialogForm } from "@/hooks/use-mutation-dialog-form";
import { formatPaymentPhaseMoney } from "@/lib/constants/manager-payment-phase-display";
import type {
  DeleteDropRefundPaymentActionState,
  ManagerDropRefundPaymentRow,
} from "@/types/manager-semester-drop";

const initialState: DeleteDropRefundPaymentActionState = {};

type DeleteDropRefundPaymentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: ManagerDropRefundPaymentRow | null;
  onDeleted: (paymentId: string) => void;
};

export function DeleteDropRefundPaymentDialog({
  open,
  onOpenChange,
  row,
  onDeleted,
}: DeleteDropRefundPaymentDialogProps) {
  const router = useRouter();

  const { formAction, isPending, handleOpenChange, state } =
    useMutationDialogForm({
      action: deleteDropRefundPaymentAction,
      initialState,
      open,
      onOpenChange,
      onSuccess: (next) => {
        if (next.deletedPaymentId) {
          onDeleted(next.deletedPaymentId);
        }
        onOpenChange(false);
        router.refresh();
      },
    });

  function handleConfirm() {
    if (!row || isPending) {
      return;
    }
    const formData = new FormData();
    formData.set("payment_id", row.id);
    formAction(formData);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Delete refund payment</DialogTitle>
          <DialogDescription>
            Remove the debit of{" "}
            {formatPaymentPhaseMoney(row?.amount ?? 0)} for{" "}
            {row?.student_label ?? "this student"}? It will no longer count in
            payment stats. The semester drop stays completed.
          </DialogDescription>
        </DialogHeader>

        {state.error ? (
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
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending || !row}
          >
            {isPending ? <InlineSpinner /> : null}
            Delete payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
