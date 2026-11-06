"use client";

import { ClassTabCollapsibleSection } from "@/components/manager/students/class-tab-collapsible-section";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { COLLAPSIBLE_SECTION_STORAGE_KEYS } from "@/lib/constants/collapsible-section-storage";
import {
  buildClassSessionSlots,
  getClassSessionSlotSummary,
  getSessionSlotCheckpointTone,
  getSessionSlotProgressTone,
  isSessionSlotFilled,
  type ClassSessionSlot,
} from "@/lib/constants/manager-class-session-progress";
import {
  CLASS_SESSION_CARD_LIMITS,
  SESSION_TIMING_LABELS,
} from "@/lib/constants/manager-class-session-display";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import {
  getSessionTimingLabel,
  type ManagerClassSessionRow,
} from "@/types/manager-class-session";
import type { ManagerClassRow } from "@/types/manager-class-list";

type ClassSessionProgressTrackProps = {
  classRow: ManagerClassRow;
  sessions: ManagerClassSessionRow[];
  /** When false, section stays open with no expand/collapse controls. */
  collapsible?: boolean;
};

const TRACK_Y = "top-4";

function CheckpointDot({
  className,
  ariaLabel,
  leftPercent,
}: {
  className?: string;
  ariaLabel: string;
  leftPercent: number;
}) {
  return (
    <div
      role="img"
      aria-label={ariaLabel}
      style={{ left: `${leftPercent}%` }}
      className={cn(
        "absolute z-20 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] bg-card shadow-sm",
        TRACK_Y,
        className
      )}
    />
  );
}

function CheckpointLabel({ slot }: { slot: ClassSessionSlot }) {
  const topic = slot.session?.topic ?? "Not scheduled";
  const { display, isTruncated } = truncateText(
    topic,
    CLASS_SESSION_CARD_LIMITS.topic
  );
  const timingText = slot.session
    ? SESSION_TIMING_LABELS[getSessionTimingLabel(slot.session)]
    : "Not scheduled";

  return (
    <div className="flex min-w-0 flex-col items-center gap-1 px-1 text-center">
      <p className="w-full text-xs font-medium text-foreground">
        S{slot.nb_order}
      </p>
      <p className="w-full text-[11px] text-muted-foreground">
        {isTruncated ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <span className="block cursor-default truncate" tabIndex={0} />
              }
            >
              {display}
            </TooltipTrigger>
            <TooltipContent>{topic}</TooltipContent>
          </Tooltip>
        ) : (
          <span className="block truncate">{display}</span>
        )}
      </p>
      <p
        className={cn(
          "text-[11px] font-medium",
          slot.session
            ? getSessionTimingLabel(slot.session) === "completed"
              ? "text-emerald-600 dark:text-emerald-400"
              : getSessionTimingLabel(slot.session) === "in_progress"
                ? "text-amber-600 dark:text-amber-400"
                : "text-sky-600 dark:text-sky-400"
            : "text-muted-foreground"
        )}
      >
        {timingText}
      </p>
    </div>
  );
}

export function ClassSessionProgressTrack({
  classRow,
  sessions,
  collapsible = true,
}: ClassSessionProgressTrackProps) {
  if (classRow.subject_nb_sessions <= 0) {
    return null;
  }

  const slots = buildClassSessionSlots(classRow, sessions);
  const summary = getClassSessionSlotSummary(classRow);
  const checkpointCount = slots.length + 1;

  return (
    <TooltipProvider>
      <ClassTabCollapsibleSection
        title="Class session progress"
        description={`Session delivery progress for this class (${summary.completedSessions}/${summary.totalSessions} sessions scheduled).`}
        storageKey={
          COLLAPSIBLE_SECTION_STORAGE_KEYS.CLASS_DETAILS_SESSION_PROGRESS
        }
        collapsible={collapsible}
        action={
          <div className="pr-1 text-right">
            <p className="text-lg font-semibold tabular-nums tracking-tight leading-none">
              {summary.overallRate}%
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Overall
            </p>
          </div>
        }
      >
        <div className="overflow-x-auto px-4 pt-4 pb-5 sm:px-5">
          <div
            className="relative mx-5 min-w-full sm:mx-8"
            style={{ minWidth: `${Math.max(slots.length * 8, 18)}rem` }}
          >
            <div
              className={cn(
                "pointer-events-none absolute inset-x-0 h-1.5 rounded-full bg-muted ring-1 ring-foreground/10",
                TRACK_Y,
                "-translate-y-1/2"
              )}
            />

            <div className="relative flex">
              {slots.map((slot, index) => {
                const isFilled = isSessionSlotFilled(slot);
                const tone = getSessionSlotProgressTone(slot.session, classRow);
                const isFirst = index === 0;
                const isLast = index === slots.length - 1;

                return (
                  <div
                    key={`slot-${slot.nb_order}`}
                    className="relative min-w-[7rem] flex-1"
                    title={
                      slot.session
                        ? `S${slot.nb_order}: ${slot.session.topic}`
                        : `S${slot.nb_order}: Not scheduled`
                    }
                  >
                    <div className="relative h-8">
                      {isFilled ? (
                        <div
                          className={cn(
                            "absolute left-0 h-1.5 max-w-full -translate-y-1/2 transition-[width]",
                            TRACK_Y,
                            tone.fillClassName,
                            isFirst && "rounded-l-full",
                            isLast && "rounded-r-full"
                          )}
                          style={{ width: "100%" }}
                        />
                      ) : null}
                    </div>

                    <div className="mt-4">
                      <CheckpointLabel slot={slot} />
                    </div>
                  </div>
                );
              })}
            </div>

            {Array.from({ length: checkpointCount }, (_, checkpointIndex) => {
              const leftPercent = (checkpointIndex / slots.length) * 100;
              const toneClassName = getSessionSlotCheckpointTone(
                slots,
                checkpointIndex,
                classRow
              );

              return (
                <CheckpointDot
                  key={`checkpoint-${checkpointIndex}`}
                  leftPercent={leftPercent}
                  ariaLabel={
                    checkpointIndex === 0
                      ? "Class track start"
                      : checkpointIndex === slots.length
                        ? "Class track end"
                        : `Checkpoint between session ${checkpointIndex} and ${checkpointIndex + 1}`
                  }
                  className={toneClassName}
                />
              );
            })}
          </div>
        </div>
      </ClassTabCollapsibleSection>
    </TooltipProvider>
  );
}
