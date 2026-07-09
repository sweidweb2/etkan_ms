"use client";

import { format } from "date-fns";
import { MessageSquareTextIcon } from "lucide-react";
import { ScheduledPaymentStatusBadge } from "@/components/manager/accounting/scheduled-payment-status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatAccountCurrency } from "@/lib/constants/manager-subscribed-semester-display";
import type { ManagerScheduledPaymentRow } from "@/types/manager-scheduled-payment";

type ScheduledPaymentDetailsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduledPayment: ManagerScheduledPaymentRow | null;
  semesterName: string;
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

export function ScheduledPaymentDetailsDialog({
  open,
  onOpenChange,
  scheduledPayment,
  semesterName,
}: ScheduledPaymentDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareTextIcon className="size-4 text-muted-foreground" />
            Scheduled payment details
          </DialogTitle>
          <DialogDescription>
            Reminder checkpoint for {semesterName}. Informational only.
          </DialogDescription>
        </DialogHeader>

        {scheduledPayment ? (
          <dl className="grid max-h-[min(60vh,28rem)] gap-4 overflow-y-auto pr-1 sm:grid-cols-2">
            <DetailField label="Scheduled payment ID" value={scheduledPayment.id} />
            <DetailField
              label="Subscribed semester ID"
              value={scheduledPayment.subscribed_semester_id}
            />
            <DetailField label="Semester" value={semesterName} />
            <DetailField
              label="Payment date"
              value={formatTimestamp(scheduledPayment.payment_date)}
            />
            <DetailField
              label="Expected amount"
              value={
                scheduledPayment.amount != null
                  ? formatAccountCurrency(scheduledPayment.amount)
                  : "—"
              }
            />
            <div className="flex flex-col gap-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Status
              </dt>
              <dd>
                <ScheduledPaymentStatusBadge status={scheduledPayment.status} />
              </dd>
            </div>
            <DetailField
              label="Created"
              value={formatTimestamp(scheduledPayment.created_at)}
            />
            <DetailField
              label="Updated"
              value={formatTimestamp(scheduledPayment.updated_at)}
            />
            <div className="flex flex-col gap-1 sm:col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Note
              </dt>
              <dd className="text-sm text-foreground">
                {scheduledPayment.note ?? "—"}
              </dd>
            </div>
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
