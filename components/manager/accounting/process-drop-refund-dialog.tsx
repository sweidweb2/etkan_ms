"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { processDropRefundAction } from "@/app/manager/accounting/actions";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutationDialogForm } from "@/hooks/use-mutation-dialog-form";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_VALUES,
} from "@/lib/manager/accounting/constants";
import type {
  ManagerNeedRefundRow,
  ManagerSemesterDropRequestRow,
} from "@/types/manager-semester-drop";

type ProcessDropRefundActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  request?: ManagerSemesterDropRequestRow;
};

const initialState: ProcessDropRefundActionState = {};

type ProcessDropRefundDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: ManagerNeedRefundRow | null;
  onProcessed: (request: ManagerSemesterDropRequestRow) => void;
};

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function ProcessDropRefundDialog({
  open,
  onOpenChange,
  row,
  onProcessed,
}: ProcessDropRefundDialogProps) {
  const router = useRouter();

  const remaining = row?.remaining_refund ?? 0;
  const resetToken = open && row ? `${row.id}:${remaining}` : null;
  const [prevResetToken, setPrevResetToken] = useState(resetToken);
  const [amount, setAmount] = useState(
    remaining > 0 ? String(remaining) : ""
  );
  const [paymentDate, setPaymentDate] = useState(todayIsoDate);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [receivedBy, setReceivedBy] = useState("Management");
  const [notes, setNotes] = useState("");

  if (resetToken !== prevResetToken) {
    setPrevResetToken(resetToken);
    if (resetToken !== null) {
      setAmount(remaining > 0 ? String(remaining) : "");
      setPaymentDate(todayIsoDate());
      setPaymentMethod("cash");
      setReceivedBy("Management");
      setNotes("");
    }
  }

  const { formAction, isPending, handleOpenChange, state } =
    useMutationDialogForm({
      action: processDropRefundAction,
      initialState,
      open,
      onOpenChange,
      onSuccess: (next) => {
        if (next.request) {
          onProcessed(next.request);
        }
        onOpenChange(false);
        router.refresh();
      },
    });

  function handleSubmit() {
    if (!row || isPending) {
      return;
    }
    const formData = new FormData();
    formData.set("request_id", row.id);
    formData.set("amount", amount.trim());
    formData.set("payment_date", paymentDate);
    formData.set("payment_method", paymentMethod);
    formData.set("received_by", receivedBy.trim());
    formData.set("received_by_management", "on");
    if (notes.trim()) {
      formData.set("notes", notes.trim());
    }
    formAction(formData);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Mark refunded</DialogTitle>
          <DialogDescription>
            Record a debit refund for {row?.student_label ?? "this student"}.
            Remaining owed: {remaining.toFixed(2)}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              min={0.01}
              step={0.01}
              max={remaining}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              disabled={isPending}
              required
            />
            {state.fieldErrors?.amount?.[0] ? (
              <p className="text-sm text-destructive">
                {state.fieldErrors.amount[0]}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="payment_date">Date</Label>
            <Input
              id="payment_date"
              name="payment_date"
              type="date"
              value={paymentDate}
              onChange={(event) => setPaymentDate(event.target.value)}
              disabled={isPending}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="payment_method">Method</Label>
            <select
              id="payment_method"
              name="payment_method"
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value)}
              disabled={isPending}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
            >
              {PAYMENT_METHOD_VALUES.map((method) => (
                <option key={method} value={method}>
                  {PAYMENT_METHOD_LABELS[method]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="received_by">Recorded by</Label>
            <Input
              id="received_by"
              name="received_by"
              value={receivedBy}
              onChange={(event) => setReceivedBy(event.target.value)}
              disabled={isPending}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              name="notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={isPending}
            />
          </div>

          {state.error && !state.fieldErrors ? (
            <p className="text-sm text-destructive">{state.error}</p>
          ) : null}
        </div>

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
            onClick={handleSubmit}
            disabled={isPending || !row}
          >
            {isPending ? <InlineSpinner /> : null}
            Mark refunded
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
