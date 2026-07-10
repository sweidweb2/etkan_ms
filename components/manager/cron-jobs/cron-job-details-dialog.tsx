"use client";

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
import {
  CRON_JOB_FREQUENCY_LABELS,
  CRON_JOB_STATUS_BADGE_CLASSES,
  CRON_JOB_STATUS_LABELS,
} from "@/lib/constants/manager-cron-job-display";
import { cn } from "@/lib/utils";
import type { ManagerCronJobRow } from "@/types/manager-cron-job";

type CronJobDetailsDialogProps = {
  job: ManagerCronJobRow | null;
  onOpenChange: (open: boolean) => void;
};

function DetailField({
  label,
  value,
  className,
  mono,
}: {
  label: string;
  value: string;
  className?: string;
  mono?: boolean;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd
        className={cn(
          "text-sm text-foreground",
          mono && "break-all font-mono text-xs"
        )}
      >
        {value}
      </dd>
    </div>
  );
}

export function CronJobDetailsDialog({
  job,
  onOpenChange,
}: CronJobDetailsDialogProps) {
  return (
    <Dialog
      open={job !== null}
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
            Cron job details
          </DialogTitle>
          <DialogDescription>
            Full catalog entry for this scheduled job.
          </DialogDescription>
        </DialogHeader>

        {job ? (
          <div className="max-h-[min(65vh,32rem)] space-y-4 overflow-y-auto pr-1">
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailField
                label="Job name"
                value={job.job_name}
                className="sm:col-span-2"
                mono
              />
              <DetailField label="Schedule" value={job.schedule} mono />
              <DetailField label="Schedule label" value={job.schedule_label} />
              <DetailField
                label="Frequency"
                value={CRON_JOB_FREQUENCY_LABELS[job.frequency]}
              />
              <div className="flex flex-col gap-1">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Status
                </dt>
                <dd>
                  <span
                    className={cn(
                      "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
                      CRON_JOB_STATUS_BADGE_CLASSES[job.status]
                    )}
                  >
                    {CRON_JOB_STATUS_LABELS[job.status]}
                  </span>
                </dd>
              </div>
              <DetailField
                label="Function"
                value={job.function_name}
                className="sm:col-span-2"
                mono
              />
              <DetailField
                label="Tables"
                value={job.tables.join(", ")}
                className="sm:col-span-2"
              />
              <DetailField
                label="Summary"
                value={job.summary}
                className="sm:col-span-2"
              />
              <DetailField
                label="Description"
                value={job.description}
                className="sm:col-span-2"
              />
              <DetailField
                label="Migration"
                value={job.migration}
                className="sm:col-span-2"
                mono
              />
            </dl>

            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Verify
              </p>
              <pre className="overflow-x-auto rounded-lg border bg-muted/30 p-3 text-xs text-foreground whitespace-pre-wrap">
                {job.verify_hint}
              </pre>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Manual run
              </p>
              <pre className="overflow-x-auto rounded-lg border bg-muted/30 p-3 font-mono text-xs text-foreground">
                {job.manual_run}
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
