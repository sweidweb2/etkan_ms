"use client";

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
import type { ManagerNeedRefundRow } from "@/types/manager-semester-drop";

type ProcessDropRefundActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

const initialState: ProcessDropRefundActionState = {};

type ProcessDropRefundDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: ManagerNeedRefundRow | null;
  onProcessed: () => void;
};

export function ProcessDropRefundDialog({
  open,
  onOpenChange,
  row,
  onProcessed,
}: ProcessDropRefundDialogProps) {
  const router = useRouter();
  const { formAction, isPending, handleOpenChange, state } =
    useMutationDialogForm({
      action: processDropRefundAction,
      initialState,
      open,
      onOpenChange,
      onSuccess: () => {
        onProcessed();
        onOpenChange(false);
        router.refresh();
      },
    });

  const today = new Date().toISOString().slice(0, 10);
  const remaining = row?.remaining_refund ?? 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
        <form action={formAction} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Mark refunded</DialogTitle>
            <DialogDescription>
              Record a debit refund for {row?.student_label ?? "this student"}.
              Remaining owed: {remaining.toFixed(2)}.
            </DialogDescription>
          </DialogHeader>

          <input type="hidden" name="request_id" value={row?.id ?? ""} />

          <div className="flex flex-col gap-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              min={0.01}
              step={0.01}
              max={remaining}
              defaultValue={remaining}
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
              defaultValue={today}
              disabled={isPending}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="payment_method">Method</Label>
            <select
              id="payment_method"
              name="payment_method"
              defaultValue="cash"
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
              defaultValue="Management"
              disabled={isPending}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" name="notes" disabled={isPending} />
          </div>

          {state.error && !state.fieldErrors ? (
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
            <Button type="submit" disabled={isPending || !row}>
              {isPending ? <InlineSpinner /> : null}
              Mark refunded
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
