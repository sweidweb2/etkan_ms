"use client";

import Link from "next/link";
import { format } from "date-fns";
import {
  BookOpenIcon,
  CalendarIcon,
  GraduationCapIcon,
  HashIcon,
  UsersIcon,
} from "lucide-react";
import {
  getClassProgressTone,
  getClassSessionCompletionRate,
} from "@/lib/constants/manager-semester-class-progress";
import { Button } from "@/components/ui/button";
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
import { MANAGER_CLASS_CARD_LIMITS } from "@/lib/constants/manager-class-display";
import {
  CLASS_STATUS_BADGE_CLASSES,
  CLASS_STATUS_LABELS,
} from "@/lib/constants/manager-subject-display";
import {
  getManagerClassDetailRoute,
  getManagerSemesterDetailRoute,
} from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import type { ManagerClassRow } from "@/types/manager-class-list";

type ClassCardProps = {
  classRow: ManagerClassRow;
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

export function ClassCard({ classRow }: ClassCardProps) {
  const statusLabel =
    CLASS_STATUS_LABELS[classRow.status] ?? classRow.status;
  const statusClassName =
    CLASS_STATUS_BADGE_CLASSES[classRow.status] ??
    "bg-muted text-muted-foreground";
  const sessionRate = getClassSessionCompletionRate(classRow);
  const sessionTone = getClassProgressTone(classRow);

  return (
    <TooltipProvider>
      <Card className="group relative flex h-full flex-col overflow-hidden py-0 transition-shadow hover:border-primary/35 hover:shadow-[0_12px_32px_rgba(59,130,246,0.16)]">
        <Link
          href={getManagerClassDetailRoute(classRow.id)}
          aria-label={`View ${classRow.name}`}
          className="absolute inset-0 z-0 rounded-xl"
        />
        <CardHeader className="relative z-10 gap-2 border-b bg-muted/20 py-3 pointer-events-none">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-700 dark:text-violet-300">
                <GraduationCapIcon className="size-5" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-base leading-snug">
                  <TruncatedText
                    value={classRow.name}
                    maxLength={MANAGER_CLASS_CARD_LIMITS.name}
                  />
                </CardTitle>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <BookOpenIcon className="size-3 shrink-0" />
                  <TruncatedText
                    value={classRow.subject_name}
                    maxLength={MANAGER_CLASS_CARD_LIMITS.subjectName}
                  />
                </p>
              </div>
            </div>
            <span
              className={cn(
                "inline-flex shrink-0 rounded-md px-2 py-0.5 text-xs font-medium capitalize",
                statusClassName
              )}
            >
              {statusLabel}
            </span>
          </div>
        </CardHeader>

        <CardContent className="relative z-10 flex flex-1 flex-col gap-3 py-4 pointer-events-none">
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
                className={cn(
                  "h-full rounded-full transition-[width]",
                  sessionTone.fillClassName
                )}
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
                maxLength={MANAGER_CLASS_CARD_LIMITS.id}
              />
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <UsersIcon className="size-3.5 shrink-0" />
            <span className="shrink-0">Enrollment</span>
            <span className="min-w-0 font-medium tabular-nums text-foreground">
              {classRow.enrollment_count}
            </span>
            <span aria-hidden="true">·</span>
            <span className="shrink-0">Teachers</span>
            <span className="font-medium tabular-nums text-foreground">
              {classRow.teacher_count}
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

        <CardFooter className="relative z-10 mt-auto flex-col items-stretch gap-2.5 border-t bg-muted/20 py-3 pointer-events-none">
          <p className="min-w-0 text-xs text-muted-foreground">
            <span className="shrink-0">Semester:</span>{" "}
            {classRow.semester_name ? (
              <TruncatedText
                value={classRow.semester_name}
                maxLength={MANAGER_CLASS_CARD_LIMITS.semesterName}
                className="font-medium text-foreground"
              />
            ) : (
              <span className="font-medium text-foreground">Unlinked</span>
            )}
          </p>
          <div
            className={cn(
              "pointer-events-auto relative z-10 grid w-full gap-2",
              classRow.semester_id ? "grid-cols-2" : "grid-cols-1"
            )}
          >
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-full min-w-0 bg-background px-2"
              nativeButton={false}
              render={<Link href={getManagerClassDetailRoute(classRow.id)} />}
            >
              <span className="truncate">View class</span>
            </Button>
            {classRow.semester_id ? (
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-full min-w-0 bg-background px-2"
                nativeButton={false}
                render={
                  <Link
                    href={getManagerSemesterDetailRoute(classRow.semester_id)}
                  />
                }
              >
                <span className="truncate">View semester</span>
              </Button>
            ) : null}
          </div>
        </CardFooter>
      </Card>
    </TooltipProvider>
  );
}
