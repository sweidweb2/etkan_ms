"use client";

import {
  GridCardBody,
  GridCardFooter,
  GridCardViewButton,
} from "@/components/manager/shared/grid-card";
import { FrostedGlassCard } from "@/components/ui/frosted-glass-card";
import {
  MANAGER_CLASS_STATUS_DOT_CLASSES,
  MANAGER_CLASS_STATUS_LABELS,
} from "@/lib/constants/manager-class-display";
import {
  getClassProgressTone,
  getClassSessionCompletionRate,
} from "@/lib/constants/manager-semester-class-progress";
import { getManagerClassDetailRoute } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import type { ManagerClassRow } from "@/types/manager-class-list";

type ClassCardProps = {
  classRow: ManagerClassRow;
};

export function ClassCard({ classRow }: ClassCardProps) {
  const sessionRate = getClassSessionCompletionRate(classRow);
  const sessionTone = getClassProgressTone(classRow);
  const detailHref = getManagerClassDetailRoute(classRow.id);
  const statusLabel = MANAGER_CLASS_STATUS_LABELS[classRow.status];

  return (
    <FrostedGlassCard href={detailHref} hrefAriaLabel={`View ${classRow.name}`}>
      <GridCardBody title={classRow.name} subtitle={classRow.subject_name} />

      <div
        role="progressbar"
        aria-label={`Session progress for ${classRow.name}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={sessionRate}
        className="pointer-events-none relative z-10 h-0.5 bg-border"
      >
        <div
          className={cn(
            "h-full transition-[width]",
            sessionTone.fillClassName
          )}
          style={{ width: `${sessionRate}%` }}
        />
      </div>

      <GridCardFooter
        className="border-t-0"
        meta={
          <>
            <span
              aria-hidden
              title={statusLabel}
              className={cn(
                "size-2 shrink-0 rounded-full",
                MANAGER_CLASS_STATUS_DOT_CLASSES[classRow.status]
              )}
            />
            <span className="sr-only">{statusLabel},</span>
            <span className="truncate">
              <span className="font-medium text-foreground tabular-nums">
                {classRow.completed_sessions}/{classRow.subject_nb_sessions}
              </span>{" "}
              sessions
            </span>
          </>
        }
        actions={
          <GridCardViewButton
            href={detailHref}
            label={`View ${classRow.name}`}
          />
        }
      />
    </FrostedGlassCard>
  );
}
