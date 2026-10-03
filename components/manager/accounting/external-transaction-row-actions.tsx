"use client";

import { PencilIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";

type ExternalTransactionRowActionsProps = {
  description: string;
  linkedWorkshopPaymentId: string | null;
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

export function ExternalTransactionRowActions({
  description,
  linkedWorkshopPaymentId,
  canUpdate,
  canDelete,
  onEdit,
  onDelete,
}: ExternalTransactionRowActionsProps) {
  if (linkedWorkshopPaymentId) {
    return (
      <span
        className="text-xs text-muted-foreground"
        title="Manage this from Workshops payments"
      >
        Workshop
      </span>
    );
  }

  if (!canUpdate && !canDelete) {
    return null;
  }

  return (
    <div className="inline-flex items-center justify-end gap-1">
      {canUpdate ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-7"
          aria-label={`Edit transaction ${description}`}
          onClick={onEdit}
        >
          <PencilIcon className="size-3.5" />
        </Button>
      ) : null}
      {canDelete ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
          aria-label={`Delete transaction ${description}`}
          onClick={onDelete}
        >
          <Trash2Icon className="size-3.5" />
        </Button>
      ) : null}
    </div>
  );
}
