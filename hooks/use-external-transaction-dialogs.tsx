"use client";

import { useState } from "react";
import { DeleteTransactionDialog } from "@/components/manager/accounting/delete-transaction-dialog";
import { EditTransactionDialog } from "@/components/manager/accounting/edit-transaction-dialog";
import type { ManagerIncomeTransactionRow } from "@/types/manager-income-statement";

type UseExternalTransactionDialogsOptions = {
  /** Called after a successful delete so the table can drop the row immediately. */
  onDeleted?: (id: string) => void;
};

export function useExternalTransactionDialogs(
  options: UseExternalTransactionDialogsOptions = {}
) {
  const { onDeleted } = options;
  const [editingTransaction, setEditingTransaction] =
    useState<ManagerIncomeTransactionRow | null>(null);
  const [deletingTransaction, setDeletingTransaction] =
    useState<ManagerIncomeTransactionRow | null>(null);

  return {
    openEdit: (transaction: ManagerIncomeTransactionRow) => {
      setEditingTransaction(transaction);
    },
    openDelete: (transaction: ManagerIncomeTransactionRow) => {
      setDeletingTransaction(transaction);
    },
    dialogs: (
      <>
        <EditTransactionDialog
          open={Boolean(editingTransaction)}
          onOpenChange={(open) => {
            if (!open) {
              setEditingTransaction(null);
            }
          }}
          transaction={editingTransaction}
        />
        <DeleteTransactionDialog
          open={Boolean(deletingTransaction)}
          onOpenChange={(open) => {
            if (!open) {
              setDeletingTransaction(null);
            }
          }}
          transaction={deletingTransaction}
          onDeleted={onDeleted}
        />
      </>
    ),
  };
}
