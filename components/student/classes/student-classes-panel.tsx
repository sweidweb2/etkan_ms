"use client";

import { format } from "date-fns";
import { GraduationCapIcon } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { GradientGlassCard } from "@/components/ui/gradient-glass-card";
import {
  MANAGER_CLASS_STATUS_BADGE_CLASSES,
  MANAGER_CLASS_STATUS_DOT_CLASSES,
  MANAGER_CLASS_STATUS_LABELS,
} from "@/lib/constants/manager-class-display";
import { getStudentClassDetailRoute } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import type { ManagerStudentClassRow } from "@/types/manager-student-class";

type StudentClassesPanelProps = {
  rows: ManagerStudentClassRow[];
};

export function StudentClassesPanel({ rows }: StudentClassesPanelProps) {
  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My classes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Classes you are enrolled in. Open a card to view details.
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={GraduationCapIcon}
          title="No classes yet"
          description="You are not enrolled in any classes yet."
        />
      ) : (
        <div className="grid w-full justify-start gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,16.5rem),16.5rem))]">
          {rows.map((row) => (
            <Link
              key={row.id}
              href={getStudentClassDetailRoute(row.class_id)}
              prefetch={false}
              aria-label={`View details for ${row.name}`}
              className="block h-full rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <GradientGlassCard
                id={row.id}
                cardGradient={row.card_gradient}
                title={row.name}
                glassLabel={row.subject_name}
                badge={
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                      MANAGER_CLASS_STATUS_BADGE_CLASSES[row.class_status]
                    )}
                  >
                    <span
                      className={cn(
                        "size-1.5 shrink-0 rounded-full",
                        MANAGER_CLASS_STATUS_DOT_CLASSES[row.class_status]
                      )}
                      aria-hidden
                    />
                    {MANAGER_CLASS_STATUS_LABELS[row.class_status]}
                  </span>
                }
                meta={
                  row.joined_at
                    ? `Joined ${format(new Date(row.joined_at), "MMM d, yyyy")}`
                    : "Joined"
                }
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
