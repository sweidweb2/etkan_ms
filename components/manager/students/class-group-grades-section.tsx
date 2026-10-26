"use client";

import { format } from "date-fns";
import { UsersIcon } from "lucide-react";
import { ClassTabCollapsibleSection } from "@/components/manager/students/class-tab-collapsible-section";
import { EmptyState } from "@/components/ui/empty-state";
import { HorizontalScrollCarousel } from "@/components/ui/horizontal-scroll-carousel";
import { SESSION_GROUP_GRADE_LEVEL_DOT_CLASSES } from "@/lib/constants/manager-session-group-grade-display";
import { cn } from "@/lib/utils";
import type { StudentSessionGroupGradeSlot } from "@/lib/manager/class-group-grade-analytics";

type ClassGroupGradesSectionProps = {
  groupGradeSlots: StudentSessionGroupGradeSlot[];
};

export function ClassGroupGradesSection({
  groupGradeSlots,
}: ClassGroupGradesSectionProps) {
  return (
    <ClassTabCollapsibleSection
      title="Group grades"
      description="Per-session group grade levels from session settings."
    >
      <div className="p-5">
        {groupGradeSlots.length === 0 ? (
          <EmptyState
            size="sm"
            icon={UsersIcon}
            title="No group grades"
            description="No group grades recorded for this class yet."
          />
        ) : (
          <div className="min-w-0 overflow-hidden rounded-xl bg-muted/25 p-2 ring-1 ring-foreground/8">
            <HorizontalScrollCarousel
              ariaLabel="Group grade sessions"
              className="rounded-lg"
              navButtonClassName="size-8 rounded-full text-muted-foreground hover:bg-background/80 hover:text-foreground disabled:opacity-30"
              resetScrollKey={groupGradeSlots.map((slot) => slot.session_id).join("|")}
            >
              <div className="flex w-max flex-row gap-3 p-1">
                {groupGradeSlots.map((slot) => (
                  <div
                    key={slot.session_id}
                    className="w-[13.5rem] shrink-0 overflow-hidden rounded-xl border bg-background"
                  >
                    <div className="border-b bg-muted/40 px-3 py-2">
                      <p className="text-sm font-semibold">{slot.session_label}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {format(new Date(slot.session_at), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-3">
                      <span
                        className={cn(
                          "size-2.5 shrink-0 rounded-full",
                          SESSION_GROUP_GRADE_LEVEL_DOT_CLASSES[slot.group_grade_level]
                        )}
                      />
                      <div className="min-w-0">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          Group grade
                        </p>
                        <p className="truncate text-sm font-medium text-violet-700 dark:text-violet-300">
                          {slot.group_grade_label}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </HorizontalScrollCarousel>
          </div>
        )}
      </div>
    </ClassTabCollapsibleSection>
  );
}
