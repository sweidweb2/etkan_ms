"use client";

import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ManagerCloudflareAiUsageRow } from "@/types/manager-cloudflare-ai-usage";

type CloudflareAiUsageDetailsDialogProps = {
  record: ManagerCloudflareAiUsageRow | null;
  onOpenChange: (open: boolean) => void;
};

function formatTokens(value: number | null) {
  if (value == null) {
    return "—";
  }
  return value.toLocaleString();
}

function formatMetadata(value: ManagerCloudflareAiUsageRow["metadata"]) {
  if (value == null) {
    return "—";
  }
  if (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0) {
    return "—";
  }
  return JSON.stringify(value, null, 2);
}

export function CloudflareAiUsageDetailsDialog({
  record,
  onOpenChange,
}: CloudflareAiUsageDetailsDialogProps) {
  return (
    <Dialog
      open={record !== null}
      onOpenChange={(open) => {
        if (!open) {
          onOpenChange(false);
        }
      }}
    >
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>AI usage details</DialogTitle>
          <DialogDescription>
            {record
              ? `${record.feature} · ${format(
                  new Date(record.created_at),
                  "MMM d, yyyy 'at' h:mm a"
                )}`
              : "Usage record"}
          </DialogDescription>
        </DialogHeader>

        {record ? (
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-2 text-sm">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  User
                </dt>
                <dd className="mt-1">{record.user_label}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Status
                </dt>
                <dd className="mt-1 capitalize">{record.status}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Model
                </dt>
                <dd className="mt-1 break-all font-mono text-xs">
                  {record.model}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Prompt tokens
                </dt>
                <dd className="mt-1 tabular-nums">
                  {formatTokens(record.prompt_tokens)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Completion tokens
                </dt>
                <dd className="mt-1 tabular-nums">
                  {formatTokens(record.completion_tokens)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Total tokens
                </dt>
                <dd className="mt-1 tabular-nums">
                  {formatTokens(record.total_tokens)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Tool rounds
                </dt>
                <dd className="mt-1 tabular-nums">{record.tool_rounds}</dd>
              </div>
            </dl>

            {record.error_message ? (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Error
                </p>
                <p className="mt-1 text-destructive">{record.error_message}</p>
              </div>
            ) : null}

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Prompt
              </p>
              <pre className="mt-1 whitespace-pre-wrap rounded-lg border bg-muted/40 p-3 text-xs">
                {record.prompt}
              </pre>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Response
              </p>
              <pre className="mt-1 whitespace-pre-wrap rounded-lg border bg-muted/40 p-3 text-xs">
                {record.response?.trim() ? record.response : "—"}
              </pre>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Metadata
              </p>
              <pre className="mt-1 overflow-x-auto whitespace-pre-wrap rounded-lg border bg-muted/40 p-3 font-mono text-xs">
                {formatMetadata(record.metadata)}
              </pre>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
