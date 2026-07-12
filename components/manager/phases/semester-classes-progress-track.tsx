"use client";

import { FileDownIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import {
  getClassProgressTone,
  getClassSessionCompletionRate,
  getSemesterSessionProgressSummary,
  isActiveSemesterClass,
} from "@/lib/constants/manager-semester-class-progress";
import { SEMESTER_CLASS_CARD_LIMITS } from "@/lib/constants/manager-semester-class-display";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import type { ManagerSemesterClassRow } from "@/types/manager-semester-class";

type SemesterClassesProgressTrackProps = {
  classes: ManagerSemesterClassRow[];
  semesterName: string;
  onExportPdf?: () => void;
  isExportingPdf?: boolean;
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

function CheckpointLabel({
  classRow,
  rate,
}: {
  classRow: ManagerSemesterClassRow;
  rate: number;
}) {
  const { display, isTruncated } = truncateText(
    classRow.name,
    SEMESTER_CLASS_CARD_LIMITS.name
  );

  return (
    <div className="flex min-w-0 flex-col items-center gap-1 px-1 text-center">
      <p className="w-full text-xs font-medium text-foreground">
        {isTruncated ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <span className="block cursor-default truncate" tabIndex={0} />
              }
            >
              {display}
            </TooltipTrigger>
            <TooltipContent>{classRow.name}</TooltipContent>
          </Tooltip>
        ) : (
          <span className="block truncate">{display}</span>
        )}
      </p>
      <p className="text-[11px] text-muted-foreground">
        {classRow.completed_sessions}/{classRow.subject_nb_sessions} sessions
      </p>
      <p
        className={cn(
          "text-[11px] font-medium tabular-nums",
          !isActiveSemesterClass(classRow)
            ? "text-rose-600 dark:text-rose-400"
            : rate > 0
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-muted-foreground"
        )}
      >
        {rate}%
      </p>
    </div>
  );
}

function getCheckpointTone(
  classes: ManagerSemesterClassRow[],
  checkpointIndex: number
) {
  if (checkpointIndex === 0) {
    return getClassProgressTone(classes[0]).dotClassName;
  }

  if (checkpointIndex === classes.length) {
    return getClassProgressTone(classes[classes.length - 1]).dotClassName;
  }

  const previousClass = classes[checkpointIndex - 1];
  const nextClass = classes[checkpointIndex];

  if (!isActiveSemesterClass(previousClass)) {
    return getClassProgressTone(previousClass).dotClassName;
  }

  if (!isActiveSemesterClass(nextClass)) {
    return getClassProgressTone(nextClass).dotClassName;
  }

  const previousRate = getClassSessionCompletionRate(previousClass);
  const nextRate = getClassSessionCompletionRate(nextClass);

  if (previousRate > 0) {
    return getClassProgressTone(previousClass).dotClassName;
  }

  if (nextRate > 0) {
    return getClassProgressTone(nextClass).dotClassName;
  }

  return getClassProgressTone(nextClass).dotClassName;
}

export function SemesterClassesProgressTrack({
  classes,
  semesterName,
  onExportPdf,
  isExportingPdf = false,
}: SemesterClassesProgressTrackProps) {
  const summary = getSemesterSessionProgressSummary(classes);

  if (classes.length === 0) {
    return null;
  }

  const checkpointCount = classes.length + 1;

  return (
    <TooltipProvider>
      <div className="rounded-xl border bg-muted/20 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium">Semester session progress</h3>
            <p className="text-xs text-muted-foreground">
              One connected track across all linked classes. Color reflects each
              class status and session completion ({summary.completedSessions}/
              {summary.totalSessions} sessions delivered).
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 self-start sm:self-center">
            {onExportPdf ? (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      disabled={isExportingPdf}
                      onClick={onExportPdf}
                      aria-label={`Export ${semesterName} page as PDF`}
                      className="print:hidden"
                    />
                  }
                >
                  {isExportingPdf ? (
                    <InlineSpinner />
                  ) : (
                    <FileDownIcon />
                  )}
                </TooltipTrigger>
                <TooltipContent>Export page as PDF</TooltipContent>
              </Tooltip>
            ) : null}
            <div className="text-right">
              <p className="text-2xl font-semibold tabular-nums tracking-tight">
                {summary.overallRate}%
              </p>
              <p className="text-xs text-muted-foreground">Overall completion</p>
            </div>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto pb-1">
          <div
            className="relative mx-5 min-w-full sm:mx-8"
            style={{ minWidth: `${Math.max(classes.length * 8, 18)}rem` }}
          >
            <div
              className={cn(
                "pointer-events-none absolute inset-x-0 h-1.5 rounded-full bg-muted ring-1 ring-foreground/10",
                TRACK_Y,
                "-translate-y-1/2"
              )}
            />

            <div className="relative flex">
              {classes.map((classRow, index) => {
                const rate = getClassSessionCompletionRate(classRow);
                const tone = getClassProgressTone(classRow);
                const isFirst = index === 0;
                const isLast = index === classes.length - 1;

                return (
                  <div
                    key={classRow.id}
                    className="relative min-w-[7rem] flex-1"
                    title={`${classRow.name}: ${classRow.completed_sessions}/${classRow.subject_nb_sessions} sessions`}
                  >
                    <div className="relative h-8">
                      {rate > 0 ? (
                        <div
                          className={cn(
                            "absolute left-0 h-1.5 max-w-full -translate-y-1/2 transition-[width]",
                            TRACK_Y,
                            tone.fillClassName,
                            isFirst && "rounded-l-full",
                            isLast && rate >= 100 && "rounded-r-full"
                          )}
                          style={{ width: `${rate}%` }}
                        />
                      ) : null}
                    </div>

                    <div className="mt-4">
                      <CheckpointLabel classRow={classRow} rate={rate} />
                    </div>
                  </div>
                );
              })}
            </div>

            {Array.from({ length: checkpointCount }, (_, checkpointIndex) => {
              const leftPercent = (checkpointIndex / classes.length) * 100;
              const toneClassName = getCheckpointTone(classes, checkpointIndex);

              return (
                <CheckpointDot
                  key={`checkpoint-${checkpointIndex}`}
                  leftPercent={leftPercent}
                  ariaLabel={
                    checkpointIndex === 0
                      ? "Semester track start"
                      : checkpointIndex === classes.length
                        ? "Semester track end"
                        : `Checkpoint between class ${checkpointIndex} and ${checkpointIndex + 1}`
                  }
                  className={toneClassName}
                />
              );
            })}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
