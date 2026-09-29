"use client";

import { useFormActionState as useActionState } from "@/hooks/use-form-action-state";
import { deleteTransactionAction } from "@/app/manager/income-statement/actions";
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
  TRANSACTION_TYPE_LABELS,
  type TransactionType,
} from "@/lib/manager/accounting/constants";
import type { DeleteTransactionActionState } from "@/types/manager-income-statement";

const initialState: DeleteTransactionActionState = {};

type DeleteTransactionTarget = {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
};

type DeleteTransactionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: DeleteTransactionTarget | null;
};

export function DeleteTransactionDialog({
  open,
  onOpenChange,
  transaction,
}: DeleteTransactionDialogProps) {
  const [state, formAction, isPending] = useActionState(
    deleteTransactionAction,
    initialState
  );
  const handleOpenChange = usePendingAwareOpenChange(isPending, onOpenChange);

  useActionStateToast(state, isPending);
  useActionStateSuccess(state, isPending, () => {
    onOpenChange(false);
  });

  function handleConfirm() {
    if (!transaction) {
      return;
    }
    const formData = new FormData();
    formData.set("id", transaction.id);
    formAction(formData);
  }

  const typeLabel = transaction
    ? TRANSACTION_TYPE_LABELS[transaction.type].toLowerCase()
    : "transaction";

  return (
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
            disabled={isPending || !transaction}
          >
            {isPending ? <InlineSpinner /> : null}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
