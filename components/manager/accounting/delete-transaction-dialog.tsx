"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteTransactionAction } from "@/app/manager/income-statement/actions";
import { PastMonthTransactionConfirmDialog } from "@/components/manager/accounting/past-month-transaction-confirm-dialog";
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
import { TRANSACTION_TYPE_LABELS } from "@/lib/manager/accounting/constants";
import { isPastIncomeStatementMonth } from "@/lib/manager/accounting/is-past-income-statement-month";
import type {
  DeleteTransactionActionState,
  ManagerIncomeTransactionRow,
} from "@/types/manager-income-statement";

const initialState: DeleteTransactionActionState = {};

type DeleteTransactionTarget = Pick<
  ManagerIncomeTransactionRow,
  "id" | "type" | "amount" | "description" | "transaction_date"
>;

type DeleteTransactionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: DeleteTransactionTarget | null;
  /** Drop the row from local table state before RSC refresh catches up. */
  onDeleted?: (id: string) => void;
};

export function DeleteTransactionDialog({
  open,
  onOpenChange,
  transaction,
  onDeleted,
}: DeleteTransactionDialogProps) {
  const router = useRouter();
  const { formAction, isPending, handleOpenChange } = useMutationDialogForm({
    action: deleteTransactionAction,
    initialState,
    open,
    onOpenChange,
    onSuccess: () => {
      if (transaction) {
        onDeleted?.(transaction.id);
      }
      onOpenChange(false);
      router.refresh();
    },
  });
  const [pastConfirmOpen, setPastConfirmOpen] = useState(false);

  function runDelete() {
    if (!transaction) {
      return;
    }
    const formData = new FormData();
    formData.set("id", transaction.id);
    formAction(formData);
  }

  function handleConfirm() {
    if (!transaction) {
      return;
    }
    if (isPastIncomeStatementMonth(transaction.transaction_date)) {
      setPastConfirmOpen(true);
      return;
    }
    runDelete();
  }

  const typeLabel = transaction
    ? TRANSACTION_TYPE_LABELS[transaction.type].toLowerCase()
    : "transaction";

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="sm:max-w-md"
          showCloseButton={!isPending}
        >
          <DialogHeader>
            <DialogTitle>Delete transaction</DialogTitle>
            <DialogDescription>
              Permanently delete this {typeLabel} of{" "}
              {transaction
                ? formatPaymentPhaseMoney(transaction.amount)
                : "—"}
              {transaction?.description
                ? ` (“${transaction.description}”)`
                : ""}
              ? This cannot be undone.
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
              disabled={isPending || !transaction}
            >
              {isPending ? <InlineSpinner /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <PastMonthTransactionConfirmDialog
        open={pastConfirmOpen}
        onOpenChange={setPastConfirmOpen}
        disabled={isPending}
        onConfirm={() => {
          setPastConfirmOpen(false);
          runDelete();
        }}
      />
    </>
  );
}
