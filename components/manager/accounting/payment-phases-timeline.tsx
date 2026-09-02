"use client";

import { useMemo, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatPaymentPhaseMoney } from "@/lib/constants/manager-payment-phase-display";
import { getManagerAccountingPhaseDetailRoute } from "@/lib/constants/routes";
import {
  buildMonthTicks,
  buildTimelineDomain,
  colorForPhaseId,
  dateToPercent,
  filterOpenPhases,
  parseTimelineDate,
  phaseBarLayout,
  toTimelineIsoDate,
} from "@/lib/manager/accounting/payment-phase-timeline";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import type { ManagerPaymentPhaseRow } from "@/types/manager-payment-phase";

const GUTTER_CLASS = "w-40 shrink-0 sm:w-44";
const LANE_HEIGHT_CLASS = "h-10";
const BAR_MIN_LABEL_WIDTH_PERCENT = 12;

type PaymentPhasesTimelineProps = {
  phases: ManagerPaymentPhaseRow[];
};

function PhaseGutterLabel({
  name,
  fill,
  accent,
}: {
  name: string;
  fill: string;
  accent: string;
}) {
  const { display, isTruncated } = truncateText(name, 22);

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

export function PaymentPhasesTimeline({ phases }: PaymentPhasesTimelineProps) {
  const router = useRouter();

  const openPhases = useMemo(() => filterOpenPhases(phases), [phases]);

  const todayIso = useMemo(() => toTimelineIsoDate(new Date()), []);

  const domain = useMemo(
    () => buildTimelineDomain(openPhases, new Date()),
    [openPhases]
  );

  const monthTicks = useMemo(
    () => (domain ? buildMonthTicks(domain) : []),
    [domain]
  );

  const todayPercent = useMemo(
    () => (domain ? dateToPercent(todayIso, domain) : 0),
    [domain, todayIso]
  );

  const openPhaseDetails = (phaseId: string) => {
    router.push(getManagerAccountingPhaseDetailRoute(phaseId));
  };

  const handleLaneKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    phaseId: string
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openPhaseDetails(phaseId);
    }
  };

  if (openPhases.length === 0) {
    return (
      <div className="px-4 py-10 text-center text-sm text-muted-foreground">
        <div className="rounded-lg border border-dashed px-4 py-8">
          No opened payment phases to show.
        </div>
      </div>
    );
  }

  if (!domain) {
    return null;
  }

  const spanMonths = Math.max(monthTicks.length, 1);
  const trackMinWidthRem = Math.max(spanMonths * 5.5, 28);

  return (
    <TooltipProvider>
      <div className="overflow-x-auto px-4 pt-3 pb-4">
        <div
          className="min-w-full"
          style={{ minWidth: `${trackMinWidthRem + 11}rem` }}
        >
          <div className="relative flex gap-3">
            <div className={cn(GUTTER_CLASS, "pt-1")} aria-hidden>
              <div className="h-5" />
            </div>
            <div
              className="relative min-w-0 flex-1"
              style={{ minWidth: `${trackMinWidthRem}rem` }}
            >
              <div
                className="pointer-events-none absolute top-0 z-20 -translate-x-1/2"
                style={{ left: `${todayPercent}%` }}
              >
                <span className="inline-flex rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-primary-foreground shadow-sm">
                  Today
                </span>
              </div>
            </div>
          </div>

          <div className="relative mt-1 flex gap-3">
            <div className={cn(GUTTER_CLASS, "flex flex-col gap-1.5")}>
              {openPhases.map((phase) => {
                const color = colorForPhaseId(phase.id);
                return (
                  <div
                    key={phase.id}
                    className={cn(
                      LANE_HEIGHT_CLASS,
                      "flex items-center pr-1"
                    )}
                  >
                    <PhaseGutterLabel
                      name={phase.name}
                      fill={color.fill}
                      accent={color.accent}
                    />
                  </div>
                );
              })}
            </div>

            <div
              className="relative min-w-0 flex-1"
              style={{ minWidth: `${trackMinWidthRem}rem` }}
            >
              <div
                className="absolute inset-0 rounded-lg bg-muted/40 ring-1 ring-foreground/8"
                aria-hidden
              />

              {monthTicks.map((tick) => (
                <div
                  key={`grid-${tick.date}`}
                  className="pointer-events-none absolute inset-y-0 z-0 w-px bg-foreground/8"
                  style={{ left: `${tick.percent}%` }}
                  aria-hidden
                />
              ))}

              <div
                className="pointer-events-none absolute inset-y-0 z-20 w-px border-l border-dashed border-primary"
                style={{ left: `${todayPercent}%` }}
                aria-hidden
              />

              <div className="relative z-10 flex flex-col gap-1.5 py-0">
                {openPhases.map((phase) => {
                  const color = colorForPhaseId(phase.id);
                  const layout = phaseBarLayout(phase, domain);
                  if (!layout) {
                    return (
                      <div
                        key={phase.id}
                        className={LANE_HEIGHT_CLASS}
                        aria-hidden
                      />
                    );
                  }

                  const start = parseTimelineDate(phase.start_date);
                  const end = parseTimelineDate(phase.end_date);
                  const dateLabel =
                    start && end
                      ? `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`
                      : `${phase.start_date} – ${phase.end_date}`;
                  const showBarLabel =
                    layout.widthPercent >= BAR_MIN_LABEL_WIDTH_PERCENT;

                  return (
                    <div
                      key={phase.id}
                      className={cn(LANE_HEIGHT_CLASS, "relative")}
                    >
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <div
                              role="link"
                              tabIndex={0}
                              aria-label={`View ${phase.name}, ${dateLabel}`}
                              className="absolute top-1/2 z-10 flex h-7 -translate-y-1/2 cursor-pointer items-center overflow-hidden rounded-md px-2 text-left shadow-sm transition-[filter,transform] hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 active:scale-[0.99]"
                              style={{
                                left: `${layout.leftPercent}%`,
                                width: `${layout.widthPercent}%`,
                                backgroundColor: color.fill,
                                borderLeft: `3px solid ${color.accent}`,
                                color: color.accent,
                              }}
                              onClick={() => openPhaseDetails(phase.id)}
                              onKeyDown={(event) =>
                                handleLaneKeyDown(event, phase.id)
                              }
                            />
                          }
                        >
                          {showBarLabel ? (
                            <span className="truncate text-[11px] font-semibold">
                              {phase.name}
                            </span>
                          ) : null}
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <div className="flex flex-col gap-0.5 text-left">
                            <p className="font-medium">{phase.name}</p>
                            <p className="text-xs opacity-90">
                              {phase.semester_name}
                              {phase.semester_code
                                ? ` · ${phase.semester_code}`
                                : ""}
                            </p>
                            <p className="text-xs opacity-90">{dateLabel}</p>
                            <p className="text-xs opacity-90">
                              {formatPaymentPhaseMoney(phase.amount)}
                              {" · "}
                              SPP {phase.spp_paid_count}/{phase.spp_active_count}
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="relative mt-2 flex gap-3">
            <div className={GUTTER_CLASS} aria-hidden />
            <div
              className="relative h-6 min-w-0 flex-1"
              style={{ minWidth: `${trackMinWidthRem}rem` }}
            >
              {monthTicks.map((tick) => (
                <span
                  key={`label-${tick.date}`}
                  className="absolute top-0 -translate-x-1/2 text-[11px] whitespace-nowrap text-muted-foreground"
                  style={{ left: `${tick.percent}%` }}
                >
                  {tick.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
