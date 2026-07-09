"use client";

import { format } from "date-fns";
import { MessageSquareTextIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatPaymentMethodLabel } from "@/lib/constants/manager-payment-display";
import { formatAccountCurrency } from "@/lib/constants/manager-subscribed-semester-display";
import type { ManagerStudentPaymentRow } from "@/types/manager-student-account";

type PaymentDetailsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: ManagerStudentPaymentRow | null;
};

function DetailField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm break-all text-foreground">{value}</dd>
    </div>
  );
}

function formatTimestamp(value: string) {
  return format(new Date(value), "MMM d, yyyy 'at' h:mm a");
}

export function PaymentDetailsDialog({
  open,
  onOpenChange,
  payment,
}: PaymentDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareTextIcon className="size-4 text-muted-foreground" />
            Payment details
          </DialogTitle>
          <DialogDescription>
            Full payment record for this subscribed semester.
          </DialogDescription>
        </DialogHeader>

        {payment ? (
          <dl className="grid gap-4 sm:grid-cols-2">
            <DetailField label="Payment ID" value={payment.id} />
            <DetailField
              label="Subscribed semester ID"
              value={payment.subscribed_semester_id}
            />
            <DetailField label="Semester" value={payment.semester_name} />
            <DetailField
              label="Amount"
              value={formatAccountCurrency(payment.amount, payment.currency)}
            />
            <DetailField label="Currency" value={payment.currency} />
            <DetailField
              label="Method"
              value={formatPaymentMethodLabel(payment.method)}
            />
            <DetailField
              label="Paid at"
              value={formatTimestamp(payment.paid_at)}
            />
          </dl>
        ) : null}

        <DialogFooter className="mt-2 sm:justify-end">
          <Button type="button" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
