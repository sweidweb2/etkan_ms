"use client";

import { format } from "date-fns";
import { MessageSquareTextIcon } from "lucide-react";
import { AuditLogActionBadge } from "@/components/manager/logs/audit-log-action-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ManagerAuditLogRow } from "@/types/manager-audit-log";

type LogDetailsDialogProps = {
  log: ManagerAuditLogRow | null;
  onOpenChange: (open: boolean) => void;
};

function formatJsonBlock(value: ManagerAuditLogRow["old_data"]) {
  if (!value || Object.keys(value).length === 0) {
    return "—";
  }

  return JSON.stringify(value, null, 2);
}

export function LogDetailsDialog({ log, onOpenChange }: LogDetailsDialogProps) {
  return (
    <Dialog
      open={log !== null}
      onOpenChange={(open) => {
        if (!open) {
          onOpenChange(false);
        }
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareTextIcon className="size-4 text-muted-foreground" />
            Log details
          </DialogTitle>
          <DialogDescription>
            Full audit record including change snapshots and metadata.
          </DialogDescription>
        </DialogHeader>

        {log ? (
          <div className="max-h-[min(65vh,32rem)] space-y-4 overflow-y-auto pr-1">
            <dl className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1 sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Log ID
                </dt>
                <dd className="break-all text-sm text-foreground">{log.id}</dd>
              </div>

              <div className="flex flex-col gap-1">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Actor
                </dt>
                <dd className="text-sm text-foreground">{log.user_label}</dd>
              </div>

              <div className="flex flex-col gap-1">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Action
                </dt>
                <dd>
                  <AuditLogActionBadge action={log.action} />
                </dd>
              </div>

              <div className="flex flex-col gap-1">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Table
                </dt>
                <dd className="text-sm text-foreground">{log.table_name ?? "—"}</dd>
              </div>

              <div className="flex flex-col gap-1">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Record ID
                </dt>
                <dd className="break-all text-sm text-foreground">
                  {log.record_id ?? "—"}
                </dd>
              </div>

              <div className="flex flex-col gap-1 sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Created at
                </dt>
                <dd className="text-sm text-foreground">
                  {format(new Date(log.created_at), "PPpp")}
                </dd>
              </div>
            </dl>

            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Old data
              </p>
              <pre className="overflow-x-auto rounded-lg border bg-muted/30 p-3 text-xs text-foreground">
                {formatJsonBlock(log.old_data)}
              </pre>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                New data
              </p>
              <pre className="overflow-x-auto rounded-lg border bg-muted/30 p-3 text-xs text-foreground">
                {formatJsonBlock(log.new_data)}
              </pre>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Metadata
              </p>
              <pre className="overflow-x-auto rounded-lg border bg-muted/30 p-3 text-xs text-foreground">
                {formatJsonBlock(log.metadata)}
              </pre>
            </div>
          </div>
        ) : null}

        <DialogFooter className="sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
