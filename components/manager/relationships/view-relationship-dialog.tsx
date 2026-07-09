"use client";

import { format } from "date-fns";
import { MessageSquareIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { ManagerRelationshipRow } from "@/types/manager-relationship";

type ViewRelationshipDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  relationship: ManagerRelationshipRow | null;
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

function UsefulBadge({ isUseful }: { isUseful: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
        isUseful
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          : "bg-muted text-muted-foreground"
      )}
    >
      {isUseful ? "Useful" : "Not useful"}
    </span>
  );
}

function formatCreatedAt(value: string) {
  if (!value) {
    return "—";
  }

  return format(new Date(value), "MMM d, yyyy 'at' h:mm a");
}

export function ViewRelationshipDialog({
  open,
  onOpenChange,
  relationship,
}: ViewRelationshipDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareIcon className="size-4 text-muted-foreground" />
            {relationship?.name ?? "Relationship details"}
          </DialogTitle>
          <DialogDescription>
            Contact information for this relationship record.
          </DialogDescription>
        </DialogHeader>

        {relationship ? (
          <dl className="grid gap-4 sm:grid-cols-2">
            <DetailField label="Contact name" value={relationship.name} />
            <DetailField label="Phone" value={relationship.phone ?? "—"} />
            <DetailField
              label="Relation"
              value={relationship.relation_with ?? "—"}
            />
            <DetailField label="Major" value={relationship.major ?? "—"} />
            <DetailField
              label="Speciality"
              value={relationship.speciality ?? "—"}
            />
            <div className="flex flex-col gap-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Useful contact
              </dt>
              <dd>
                <UsefulBadge isUseful={relationship.is_useful} />
              </dd>
            </div>
            <DetailField
              label="Created"
              value={formatCreatedAt(relationship.created_at)}
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
