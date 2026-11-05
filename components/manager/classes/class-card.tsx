"use client";

import {
  getClassProgressTone,
  getClassSessionCompletionRate,
} from "@/lib/constants/manager-semester-class-progress";
import { GradientGlassCard } from "@/components/ui/gradient-glass-card";
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

  return (
    <GradientGlassCard
      id={classRow.id}
      cardGradient={classRow.card_gradient}
      coverImageUrl={classRow.image_url}
      coverImageAlt={classRow.name}
      href={detailHref}
      hrefAriaLabel={`View ${classRow.name}`}
      title={classRow.name}
      titleLines={1}
      glassLabel={classRow.subject_name}
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
    />
  );
}
