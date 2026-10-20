"use client";

import Link from "next/link";
import { BookOpenIcon } from "lucide-react";
import {
  getClassProgressTone,
  getClassSessionCompletionRate,
} from "@/lib/constants/manager-semester-class-progress";
import { ClassCoverImage } from "@/components/classes/class-cover-image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  MANAGER_CLASS_CARD_LIMITS,
  MANAGER_CLASS_STATUS_SECONDARY_BUTTON_CLASSES,
} from "@/lib/constants/manager-class-display";
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
          <span
            className={cn("cursor-default truncate", className)}
            tabIndex={0}
          />
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
  const statusSecondaryButtonClassName =
    MANAGER_CLASS_STATUS_SECONDARY_BUTTON_CLASSES[classRow.status] ??
    "border-border bg-secondary text-secondary-foreground hover:bg-secondary/80";
  const sessionRate = getClassSessionCompletionRate(classRow);
  const sessionTone = getClassProgressTone(classRow);

  return (
    <TooltipProvider>
      <Card className="group relative gap-0 overflow-hidden py-0 transition-colors duration-150 hover:border-primary/40 hover:bg-muted/30">
        <Link
          href={getManagerClassDetailRoute(classRow.id)}
          aria-label={`View ${classRow.name}`}
          className="absolute inset-0 z-0 rounded-xl"
        />
        <ClassCoverImage
          src={classRow.image_url}
          alt={classRow.name}
          className="relative z-10"
        />
        <div className="relative z-10 flex flex-col gap-3 px-3 py-3 pointer-events-none">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-semibold leading-snug">
                <TruncatedText
                  value={classRow.name}
                  maxLength={MANAGER_CLASS_CARD_LIMITS.name}
                />
              </h3>
              <p className="mt-1 flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                <BookOpenIcon className="size-3 shrink-0" />
                <TruncatedText
                  value={classRow.subject_name}
                  maxLength={MANAGER_CLASS_CARD_LIMITS.subjectName}
                />
              </p>
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

          <div
            className={cn(
              "pointer-events-auto relative z-10 grid w-full gap-2",
              classRow.semester_id ? "grid-cols-2" : "grid-cols-1"
            )}
          >
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
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 w-full min-w-0 px-2",
                statusSecondaryButtonClassName
              )}
              nativeButton={false}
              render={<Link href={getManagerClassDetailRoute(classRow.id)} />}
            >
              <span className="truncate">View class</span>
            </Button>
          </div>
        </div>
      </Card>
    </TooltipProvider>
  );
}
