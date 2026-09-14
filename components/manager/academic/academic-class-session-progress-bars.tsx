"use client";

import Link from "next/link";
import { Can } from "@/components/auth/can";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getClassSessionCompletionRate } from "@/lib/constants/manager-semester-class-progress";
import { CLASS_STATUS_LABELS } from "@/lib/constants/manager-subject-display";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getManagerClassDetailRoute } from "@/lib/constants/routes";
import { colorForPhaseId } from "@/lib/manager/accounting/payment-phase-timeline";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import type { ManagerAcademicAnalysisClassSessionPoint } from "@/types/manager-academic-analysis";

const GUTTER_CLASS = "w-40 shrink-0 sm:w-52";
const LANE_HEIGHT_CLASS = "h-10";
const BAR_MIN_LABEL_WIDTH_PERCENT = 18;

type AcademicClassSessionProgressBarsProps = {
  classes: ManagerAcademicAnalysisClassSessionPoint[];
};

function ClassGutterLabel({
  name,
  fill,
  accent,
}: {
  name: string;
  fill: string;
  accent: string;
}) {
  const { display, isTruncated } = truncateText(name, 24);

  const content = (
    <span className="flex min-w-0 items-center gap-2">
      <span
        className="size-2.5 shrink-0 rounded-full ring-1 ring-black/10"
        style={{ backgroundColor: fill, boxShadow: `inset 0 0 0 1px ${accent}` }}
        aria-hidden
      />
      <span className="truncate text-sm font-medium text-foreground">
        {display}
      </span>
    </span>
  );

  if (!isTruncated) {
    return content;
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className="block min-w-0 cursor-default" tabIndex={0} />
        }
      >
        {content}
      </TooltipTrigger>
      <TooltipContent>{name}</TooltipContent>
    </Tooltip>
  );
}

export function AcademicClassSessionProgressBars({
  classes,
}: AcademicClassSessionProgressBarsProps) {
  if (classes.length === 0) {
    return (
      <div className="flex min-h-[8rem] items-center justify-center rounded-lg border border-dashed px-4 text-center text-sm text-muted-foreground">
        No classes to chart yet.
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="overflow-x-auto">
        <div className="relative flex min-w-[28rem] gap-3">
          <div className={cn(GUTTER_CLASS, "flex flex-col gap-1.5")}>
            {classes.map((classRow) => {
              const color = colorForPhaseId(classRow.classId);
              return (
                <div
                  key={classRow.classId}
                  className={cn(LANE_HEIGHT_CLASS, "flex items-center pr-1")}
                >
                  <ClassGutterLabel
                    name={classRow.className}
                    fill={color.fill}
                    accent={color.accent}
                  />
                </div>
              );
            })}
          </div>

          <div className="relative min-w-0 flex-1">
            <div
              className="absolute inset-0 rounded-lg bg-muted/40 ring-1 ring-foreground/8"
              aria-hidden
            />

            <div className="relative z-10 flex flex-col gap-1.5">
              {classes.map((classRow) => {
                const color = colorForPhaseId(classRow.classId);
                const rate = getClassSessionCompletionRate({
                  subject_nb_sessions: classRow.plannedSessions,
                  completed_sessions: classRow.actualSessions,
                  status: classRow.status,
                });
                const widthPercent =
                  classRow.plannedSessions <= 0
                    ? 0
                    : Math.min(100, Math.max(rate, rate > 0 ? 6 : 0));
                const countLabel = `${classRow.actualSessions}/${classRow.plannedSessions}`;
                const showBarLabel = widthPercent >= BAR_MIN_LABEL_WIDTH_PERCENT;
                const detailHref = getManagerClassDetailRoute(classRow.classId);

                return (
                  <div
                    key={classRow.classId}
                    className={cn(LANE_HEIGHT_CLASS, "relative")}
                  >
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <div
                            className="absolute top-1/2 z-10 flex h-7 -translate-y-1/2 items-center overflow-hidden rounded-md px-2 text-left shadow-sm"
                            style={{
                              left: 0,
                              width: `${Math.max(widthPercent, 0)}%`,
                              minWidth: widthPercent > 0 ? undefined : 0,
                              backgroundColor: color.fill,
                              borderLeft: `3px solid ${color.accent}`,
                              color: color.accent,
                            }}
                            aria-label={`${classRow.className}: ${countLabel} sessions, ${rate}%`}
                          />
                        }
                      >
                        {showBarLabel ? (
                          <Can
                            permission={PERMISSIONS.CLASSES_VIEW}
                            fallback={
                              <span className="truncate text-[11px] font-semibold">
                                {countLabel} · {rate}%
                              </span>
                            }
                          >
                            <Link
                              prefetch={false}
                              href={detailHref}
                              className="truncate text-[11px] font-semibold hover:underline"
                            >
                              {countLabel} · {rate}%
                            </Link>
                          </Can>
                        ) : null}
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <div className="flex flex-col gap-0.5 text-left">
                          <p className="font-medium">{classRow.className}</p>
                          <p className="text-xs opacity-90">
                            {CLASS_STATUS_LABELS[classRow.status]}
                          </p>
                          <p className="text-xs opacity-90">
                            {classRow.actualSessions} of{" "}
                            {classRow.plannedSessions} subject sessions (
                            {rate}%)
                          </p>
                        </div>
                      </TooltipContent>
                    </Tooltip>

                    {widthPercent < BAR_MIN_LABEL_WIDTH_PERCENT ? (
                      <div className="pointer-events-none absolute inset-y-0 right-2 z-20 flex items-center">
                        <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
                          {countLabel} · {rate}%
                        </span>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
