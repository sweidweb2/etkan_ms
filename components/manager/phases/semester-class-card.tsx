"use client";

import { format } from "date-fns";
import { CalendarIcon, HashIcon, UsersIcon } from "lucide-react";
import {
  getClassProgressTone,
  getClassSessionCompletionRate,
} from "@/lib/constants/manager-semester-class-progress";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SEMESTER_CLASS_CARD_LIMITS } from "@/lib/constants/manager-semester-class-display";
import {
  CLASS_STATUS_BADGE_CLASSES,
  CLASS_STATUS_LABELS,
} from "@/lib/constants/manager-subject-display";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import type { ManagerSemesterClassRow } from "@/types/manager-semester-class";

type SemesterClassCardProps = {
  classRow: ManagerSemesterClassRow;
};

function TruncatedText({
  value,
  maxLength,
  className,
}: {
  value: string;
  maxLength: number;
  className?: string;
}) {
  const { display, isTruncated } = truncateText(value, maxLength);

  if (!isTruncated) {
    return <span className={className}>{display}</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className={cn("cursor-default truncate", className)} tabIndex={0} />
        }
      >
        {display}
      </TooltipTrigger>
      <TooltipContent>{value}</TooltipContent>
    </Tooltip>
  );
}

export function SemesterClassCard({ classRow }: SemesterClassCardProps) {
  const statusLabel =
    CLASS_STATUS_LABELS[classRow.status] ?? classRow.status;
  const statusClassName =
    CLASS_STATUS_BADGE_CLASSES[classRow.status] ??
    "bg-muted text-muted-foreground";
  const sessionRate = getClassSessionCompletionRate(classRow);
  const sessionTone = getClassProgressTone(classRow);

  return (
    <TooltipProvider>
      <Card className="flex h-full flex-col overflow-hidden py-0 transition-shadow hover:shadow-md">
        <CardHeader className="gap-2 border-b bg-muted/20 py-4">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="min-w-0 flex-1 text-base leading-snug">
              <TruncatedText
                value={classRow.name}
                maxLength={SEMESTER_CLASS_CARD_LIMITS.name}
              />
            </CardTitle>
            <span
              className={cn(
                "inline-flex shrink-0 rounded-md px-2 py-0.5 text-xs font-medium capitalize",
                statusClassName
              )}
            >
              {statusLabel}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            <TruncatedText
              value={classRow.subject_name}
              maxLength={SEMESTER_CLASS_CARD_LIMITS.subjectName}
            />
          </p>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col gap-3 py-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">Session progress</span>
              <span className="font-medium tabular-nums text-foreground">
                {classRow.completed_sessions}/{classRow.subject_nb_sessions} ·{" "}
                {sessionRate}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full transition-[width]", sessionTone.fillClassName)}
                style={{ width: `${sessionRate}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <HashIcon className="size-3.5 shrink-0" />
            <span className="shrink-0">Class ID</span>
            <span className="min-w-0 font-mono text-foreground">
              <TruncatedText
                value={classRow.id}
                maxLength={SEMESTER_CLASS_CARD_LIMITS.id}
              />
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <UsersIcon className="size-3.5 shrink-0" />
            <span className="shrink-0">Enrollment</span>
            <span className="min-w-0 font-medium tabular-nums text-foreground">
              {classRow.enrollment_count}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarIcon className="size-3.5 shrink-0" />
            <span className="shrink-0">Created</span>
            <span className="min-w-0 text-foreground">
              {format(new Date(classRow.created_at), "MMM d, yyyy")}
            </span>
          </div>
        </CardContent>

        <CardFooter className="border-t bg-muted/20 py-3 text-xs text-muted-foreground">
          Subject ID:{" "}
          <span className="ml-1 font-mono text-foreground">
            <TruncatedText
              value={classRow.subject_id}
              maxLength={SEMESTER_CLASS_CARD_LIMITS.id}
            />
          </span>
        </CardFooter>
      </Card>
    </TooltipProvider>
  );
}
