"use client";

import { useState } from "react";
import { format } from "date-fns";
import { MessageSquareTextIcon } from "lucide-react";
import { AuditLogActionBadge } from "@/components/manager/logs/audit-log-action-badge";
import { AuditLogSeverityBadge } from "@/components/manager/logs/audit-log-severity-badge";
import { LogDetailsDialog } from "@/components/manager/logs/log-details-dialog";
import { Button } from "@/components/ui/button";
import type { ManagerAuditLogRow } from "@/types/manager-audit-log";
import type { ManagerStudentActivityRow } from "@/types/manager-student-activity";

type StudentActivityTableProps = {
  rows: ManagerStudentActivityRow[];
  emptyMessage?: string;
};

export function StudentActivityTable({
  rows,
  emptyMessage = "No activity recorded for this student yet.",
}: StudentActivityTableProps) {
  const [detailsLog, setDetailsLog] = useState<ManagerAuditLogRow | null>(null);

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-border/80">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Summary</th>
                <th className="px-4 py-3 font-medium">Actor</th>
                <th className="px-4 py-3 text-center font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b last:border-b-0 hover:bg-muted/30"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {format(new Date(row.created_at), "MMM d, yyyy h:mm a")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <AuditLogActionBadge action={row.action} />
                        <AuditLogSeverityBadge severity={row.severity} />
                      </div>
                    </td>
                    <td className="max-w-[16rem] px-4 py-3 text-muted-foreground">
                      <span className="line-clamp-2">{row.summary}</span>
                    </td>
                    <td className="max-w-[9rem] truncate px-4 py-3">
                      {row.actor_label}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label="View activity details"
                        onClick={() => setDetailsLog(row.log)}
                        className="text-primary hover:bg-primary/10 hover:text-primary"
                      >
                        <MessageSquareTextIcon className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <LogDetailsDialog
        log={detailsLog}
        onOpenChange={(open) => {
          if (!open) {
            setDetailsLog(null);
          }
        }}
      />
    </>
  );
}
