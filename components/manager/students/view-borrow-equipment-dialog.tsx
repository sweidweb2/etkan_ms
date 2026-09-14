"use client";

import { DetailField } from "@/components/manager/shared/detail-field";
import { format } from "date-fns";
import { MessageSquareTextIcon } from "lucide-react";
import { BorrowEquipmentStatusBadge } from "@/components/manager/students/borrow-equipment-status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ManagerStudentBorrowEquipmentRow } from "@/types/manager-student-borrow-equipment";

type ViewBorrowEquipmentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  borrowRow: ManagerStudentBorrowEquipmentRow | null;
};


function formatTimestamp(value: string | null) {
  if (!value) {
    return "—";
  }

  return format(new Date(value), "MMM d, yyyy 'at' h:mm a");
}

export function ViewBorrowEquipmentDialog({
  open,
  onOpenChange,
  borrowRow,
}: ViewBorrowEquipmentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareTextIcon className="size-4 text-muted-foreground" />
            Borrow details
          </DialogTitle>
          <DialogDescription>
            Full borrow_equipment and equipment snapshot for this row.
          </DialogDescription>
        </DialogHeader>

        {borrowRow ? (
          <dl className="grid max-h-[min(60vh,28rem)] gap-4 overflow-y-auto pr-1 sm:grid-cols-2">
            <DetailField label="Borrow ID" value={borrowRow.id} />
            <DetailField label="User ID" value={borrowRow.user_id} />
            <DetailField label="Equipment ID" value={borrowRow.equipment_id} />
            <DetailField label="Equipment name" value={borrowRow.equipment_name} />
            <div className="flex flex-col gap-1 sm:col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Equipment description
              </dt>
              <dd className="text-sm text-foreground">
                {borrowRow.equipment_description ?? "—"}
              </dd>
            </div>
            <DetailField
              label="Unit price"
              value={`$${borrowRow.equipment_unit_price.toFixed(2)}`}
            />
            <DetailField label="Quantity" value={String(borrowRow.quantity)} />
            <DetailField
              label="Borrowed at"
              value={formatTimestamp(borrowRow.borrowed_at)}
            />
            <DetailField
              label="Returned at"
              value={formatTimestamp(borrowRow.returned_at)}
            />
            <div className="flex flex-col gap-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Status
              </dt>
              <dd>
                <BorrowEquipmentStatusBadge status={borrowRow.status} />
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
