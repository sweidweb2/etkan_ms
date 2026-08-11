"use client";

import { format } from "date-fns";
import { MessageSquareTextIcon } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { fetchAuditLogDetailsAction } from "@/app/(panels)/manager/logs/actions";
import { AuditLogActionBadge } from "@/components/manager/logs/audit-log-action-badge";
import { AuditLogSeverityBadge } from "@/components/manager/logs/audit-log-severity-badge";
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
  const logId = log?.id ?? null;
  const [detail, setDetail] = useState<{
    id: string;
    row: ManagerAuditLogRow;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [loadError, setLoadError] = useState<{
    id: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!logId) {
      return;
    }

    let cancelled = false;
    startTransition(async () => {
      try {
        const full = await fetchAuditLogDetailsAction(logId);
        if (!cancelled && full) {
          setDetail({ id: logId, row: full });
        }
      } catch {
        if (!cancelled) {
          setLoadError({
            id: logId,
            message: "Unable to load change snapshots.",
          });
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [logId]);

  const display = detail?.id === logId ? detail.row : log;
  const errorMessage = loadError?.id === logId ? loadError.message : null;

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

        {display ? (
          <div className="max-h-[min(65vh,32rem)] space-y-4 overflow-y-auto pr-1">
            <dl className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1 sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Log ID
                </dt>
                <dd className="break-all text-sm text-foreground">
                  {display.id}
                </dd>
              </div>

              <div className="flex flex-col gap-1">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Actor
                </dt>
                <dd className="text-sm text-foreground">{display.user_label}</dd>
              </div>

              <div className="flex flex-col gap-1">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Action
                </dt>
                <dd>
                  <AuditLogActionBadge action={display.action} />
                </dd>
              </div>

              <div className="flex flex-col gap-1">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Severity
                </dt>
                <dd>
                  <AuditLogSeverityBadge severity={display.severity} />
                </dd>
              </div>

              <div className="flex flex-col gap-1">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Table
                </dt>
                <dd className="text-sm text-foreground">
                  {display.table_name ?? "—"}
                </dd>
              </div>

              <div className="flex flex-col gap-1">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Record ID
                </dt>
                <dd className="break-all text-sm text-foreground">
                  {display.record_id ?? "—"}
                </dd>
              </div>

              <div className="flex flex-col gap-1 sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Created at
                </dt>
                <dd className="text-sm text-foreground">
                  {format(new Date(display.created_at), "PPpp")}
                </dd>
              </div>
            </dl>

            {isPending ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <InlineSpinner />
                Loading change snapshots…
              </div>
            ) : null}
            {errorMessage ? (
              <p className="text-sm text-destructive">{errorMessage}</p>
            ) : null}

            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Old data
              </p>
              <pre className="overflow-x-auto rounded-lg border bg-muted/30 p-3 text-xs text-foreground">
                {formatJsonBlock(display.old_data)}
              </pre>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                New data
              </p>
              <pre className="overflow-x-auto rounded-lg border bg-muted/30 p-3 text-xs text-foreground">
                {formatJsonBlock(display.new_data)}
              </pre>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Metadata
              </p>
              <pre className="overflow-x-auto rounded-lg border bg-muted/30 p-3 text-xs text-foreground">
                {formatJsonBlock(display.metadata)}
              </pre>
            </div>
          </div>
        ) : null}

        <DialogFooter className="sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
