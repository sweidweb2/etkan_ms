"use client";

import {
  getClassProgressTone,
  getClassSessionCompletionRate,
} from "@/lib/constants/manager-semester-class-progress";
import { FrostedGlassCard } from "@/components/ui/frosted-glass-card";
import { getManagerClassDetailRoute } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import type { ManagerClassRow } from "@/types/manager-class-list";

type ClassCardProps = {
  classRow: ManagerClassRow;
  /** Overrides the class's own gradient (e.g. one colour per grid row). */
  cardGradient?: string;
};

export function ClassCard({ classRow, cardGradient }: ClassCardProps) {
  const sessionRate = getClassSessionCompletionRate(classRow);
  const sessionTone = getClassProgressTone(classRow);
  const detailHref = getManagerClassDetailRoute(classRow.id);

  return (
    <FrostedGlassCard
      cardGradient={cardGradient ?? classRow.card_gradient}
      href={detailHref}
      hrefAriaLabel={`View ${classRow.name}`}
      className="h-full"
    >
      <div className="pointer-events-none relative z-10 flex min-h-32 flex-1 flex-col px-4 pt-5 pb-5">
        <h2
          className="truncate text-base leading-6 font-semibold tracking-tight"
          title={classRow.name}
        >
          {classRow.name}
        </h2>
        <div className="mt-auto flex flex-col gap-1.5 pt-4">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">Session progress</span>
            <span className="font-medium tabular-nums">
              {classRow.completed_sessions}/{classRow.subject_nb_sessions} ·{" "}
              {sessionRate}%
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-foreground/10">
            <div
              className={cn(
                "h-full rounded-full transition-[width]",
                sessionTone.fillClassName
              )}
              style={{ width: `${sessionRate}%` }}
            />
          </div>
        </div>
      </div>
    </FrostedGlassCard>
  );
}
