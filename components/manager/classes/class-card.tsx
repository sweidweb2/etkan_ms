"use client";

import Link from "next/link";
import {
  getClassProgressTone,
  getClassSessionCompletionRate,
} from "@/lib/constants/manager-semester-class-progress";
import { Button } from "@/components/ui/button";
import { GradientGlassCard } from "@/components/ui/gradient-glass-card";
import {
  MANAGER_CLASS_STATUS_BADGE_CLASSES,
  MANAGER_CLASS_STATUS_DOT_CLASSES,
  MANAGER_CLASS_STATUS_LABELS,
  MANAGER_CLASS_STATUS_SECONDARY_BUTTON_CLASSES,
} from "@/lib/constants/manager-class-display";
import {
  getManagerClassDetailRoute,
  getManagerSemesterDetailRoute,
} from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import type { ManagerClassRow } from "@/types/manager-class-list";

type ClassCardProps = {
  classRow: ManagerClassRow;
};

export function ClassCard({ classRow }: ClassCardProps) {
  const statusLabel =
    MANAGER_CLASS_STATUS_LABELS[classRow.status] ?? classRow.status;
  const statusSecondaryButtonClassName =
    MANAGER_CLASS_STATUS_SECONDARY_BUTTON_CLASSES[classRow.status] ??
    "border-border bg-secondary text-secondary-foreground hover:bg-secondary/80";
  const sessionRate = getClassSessionCompletionRate(classRow);
  const sessionTone = getClassProgressTone(classRow);

  return (
    <GradientGlassCard
      id={classRow.id}
      cardGradient={classRow.card_gradient}
      title={classRow.name}
      glassLabel={classRow.subject_name}
      badge={
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
            MANAGER_CLASS_STATUS_BADGE_CLASSES[classRow.status]
          )}
        >
          <span
            className={cn(
              "size-1.5 shrink-0 rounded-full",
              MANAGER_CLASS_STATUS_DOT_CLASSES[classRow.status]
            )}
            aria-hidden
          />
          {statusLabel}
        </span>
      }
      meta={
        <div className="flex flex-col gap-1.5 text-foreground">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">Session progress</span>
            <span className="font-medium tabular-nums">
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
      }
    >
      <div
        className={cn(
          "mt-3 grid w-full gap-2",
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
                prefetch={false}
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
          render={
            <Link
              href={getManagerClassDetailRoute(classRow.id)}
              prefetch={false}
              aria-label={`View ${classRow.name}`}
            />
          }
        >
          <span className="truncate">View class</span>
        </Button>
      </div>
    </GradientGlassCard>
  );
}
