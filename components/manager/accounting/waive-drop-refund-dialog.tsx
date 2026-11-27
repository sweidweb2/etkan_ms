"use client";

import { useRouter } from "next/navigation";
import { waiveDropRefundAction } from "@/app/manager/accounting/actions";
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
  ManagerNeedRefundRow,
  WaiveDropRefundActionState,
} from "@/types/manager-semester-drop";

const initialState: WaiveDropRefundActionState = {};

type WaiveDropRefundDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: ManagerNeedRefundRow | null;
  onWaived: (request: NonNullable<WaiveDropRefundActionState["request"]>) => void;
};

export function WaiveDropRefundDialog({
  open,
  onOpenChange,
  row,
  onWaived,
}: WaiveDropRefundDialogProps) {
  const router = useRouter();

  const { formAction, isPending, handleOpenChange, state } =
    useMutationDialogForm({
      action: waiveDropRefundAction,
      initialState,
      open,
      onOpenChange,
      onSuccess: (next) => {
        if (next.request) {
          onWaived(next.request);
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
    formData.set("request_id", row.id);
    formAction(formData);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Waive drop refund</DialogTitle>
          <DialogDescription>
            Dismiss the remaining refund for{" "}
            {row?.student_label ?? "this student"} (
            {formatPaymentPhaseMoney(row?.remaining_refund ?? 0)}). No money is
            paid out; the student keeps the overpayment. The semester drop stays
            completed.
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
            Waive refund
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
