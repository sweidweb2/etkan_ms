"use client";

import * as React from "react";
import { useMemo, useRef, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type ScheduleTankSegment = {
  id: string;
  label: string;
  /** Secondary line in the tooltip, e.g. the instructor name. */
  sublabel?: string | null;
  /** Minutes from midnight. */
  startMinutes: number;
  endMinutes: number;
  /** Pastel fill, #RRGGBB. */
  color: string;
  /** Stronger tone used for the surface line and text. */
  accentColor?: string;
  /** Blocks selection (e.g. mirrored or unsaved slots). */
  locked?: boolean;
  /** Defaults to true — set false for slots whose times cannot be changed. */
  resizable?: boolean;
};

export type ScheduleTankDay = {
  key: string;
  label: string;
  shortLabel: string;
  segments: ScheduleTankSegment[];
};

type ScheduleTanksProps = {
  days: ScheduleTankDay[];
  /** Tank top edge, minutes from midnight. Default 08:00. */
  startMinutes?: number;
  /** Tank bottom edge, minutes from midnight. Default 19:00. */
  endMinutes?: number;
  onSegmentSelect?: (segment: ScheduleTankSegment) => void;
  /** Enables top/bottom edge dragging. Called once per completed drag. */
  onSegmentResize?: (
    segment: ScheduleTankSegment,
    next: { startMinutes: number; endMinutes: number }
  ) => void;
  /** Drag snapping grid, in minutes. */
  snapMinutes?: number;
  /** Shortest slot a drag may produce, in minutes. */
  minDurationMinutes?: number;
  className?: string;
};

type PlacedSegment = {
  segment: ScheduleTankSegment;
  topPercent: number;
  heightPercent: number;
  leftPercent: number;
  widthPercent: number;
};

const DEFAULT_START_MINUTES = 8 * 60;
const DEFAULT_END_MINUTES = 19 * 60;

export function formatMinutesLabel(minutes: number): string {
  const total = ((minutes % 1440) + 1440) % 1440;
  const hours24 = Math.floor(total / 60);
  const mins = total % 60;
  const meridiem = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return mins === 0
    ? `${hours12} ${meridiem}`
    : `${hours12}:${String(mins).padStart(2, "0")} ${meridiem}`;
}

/**
 * Packs a day's segments into side-by-side lanes so overlapping slots stay
 * readable. Lanes are computed per overlapping cluster, so a lone slot always
 * spans the full tank width.
 */
function placeSegments(
  segments: ScheduleTankSegment[],
  startMinutes: number,
  endMinutes: number
): PlacedSegment[] {
  const range = endMinutes - startMinutes;
  if (range <= 0) {
    return [];
  }

  const visible = segments
    .map((segment) => ({
      segment,
      start: Math.max(segment.startMinutes, startMinutes),
      end: Math.min(segment.endMinutes, endMinutes),
    }))
    .filter((item) => item.end > item.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const placed: PlacedSegment[] = [];
  let cluster: { segment: ScheduleTankSegment; start: number; end: number }[] =
    [];
  let clusterEnd = Number.NEGATIVE_INFINITY;

  function flushCluster() {
    if (cluster.length === 0) {
      return;
    }

    const laneEnds: number[] = [];
    const laneByIndex: number[] = [];

    cluster.forEach((item, index) => {
      let lane = laneEnds.findIndex((end) => end <= item.start);
      if (lane === -1) {
        lane = laneEnds.length;
      }
      laneEnds[lane] = item.end;
      laneByIndex[index] = lane;
    });

    const laneCount = laneEnds.length;
    const laneWidth = 100 / laneCount;

    cluster.forEach((item, index) => {
      const lane = laneByIndex[index] ?? 0;
      placed.push({
        segment: item.segment,
        topPercent: ((item.start - startMinutes) / range) * 100,
        heightPercent: ((item.end - item.start) / range) * 100,
        leftPercent: lane * laneWidth,
        widthPercent: laneWidth,
      });
    });

    cluster = [];
    clusterEnd = Number.NEGATIVE_INFINITY;
  }

  for (const item of visible) {
    if (cluster.length > 0 && item.start >= clusterEnd) {
      flushCluster();
    }
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.end);
  }
  flushCluster();

  return placed;
}

function hourMarks(startMinutes: number, endMinutes: number): number[] {
  const marks: number[] = [];
  const firstHour = Math.ceil(startMinutes / 60) * 60;
  for (let minute = firstHour; minute <= endMinutes; minute += 60) {
    marks.push(minute);
  }
  return marks;
}

function liquidBackground(color: string): string {
  return [
    `linear-gradient(180deg,`,
    `color-mix(in oklab, ${color} 82%, white) 0%,`,
    `${color} 38%,`,
    `color-mix(in oklab, ${color} 86%, black) 100%)`,
  ].join(" ");
}

type ResizeEdge = "start" | "end";

type ResizeDraft = { startMinutes: number; endMinutes: number };

function TankSegment({
  placed,
  tankRef,
  rangeStartMinutes,
  rangeEndMinutes,
  snapMinutes,
  minDurationMinutes,
  onSelect,
  onResize,
}: {
  placed: PlacedSegment;
  tankRef: React.RefObject<HTMLDivElement | null>;
  rangeStartMinutes: number;
  rangeEndMinutes: number;
  snapMinutes: number;
  minDurationMinutes: number;
  onSelect?: (segment: ScheduleTankSegment) => void;
  onResize?: (
    segment: ScheduleTankSegment,
    next: { startMinutes: number; endMinutes: number }
  ) => void;
}) {
  const { segment } = placed;
  const accent = segment.accentColor ?? segment.color;
  const interactive = Boolean(onSelect) && !segment.locked;
  const resizable =
    Boolean(onResize) && !segment.locked && segment.resizable !== false;

  const [draft, setDraft] = useState<ResizeDraft | null>(null);
  const dragRef = useRef<{
    edge: ResizeEdge;
    pointerId: number;
    originY: number;
    minutesPerPixel: number;
    startMinutes: number;
    endMinutes: number;
    latest: ResizeDraft;
    moved: boolean;
  } | null>(null);

  const shownStart = draft?.startMinutes ?? segment.startMinutes;
  const shownEnd = draft?.endMinutes ?? segment.endMinutes;
  const timeRange = `${formatMinutesLabel(shownStart)} – ${formatMinutesLabel(shownEnd)}`;

  function handleResizePointerDown(
    event: React.PointerEvent<HTMLSpanElement>,
    edge: ResizeEdge
  ) {
    if (!resizable || event.button !== 0) {
      return;
    }

    const tankHeight = tankRef.current?.getBoundingClientRect().height ?? 0;
    if (tankHeight <= 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);

    dragRef.current = {
      edge,
      pointerId: event.pointerId,
      originY: event.clientY,
      minutesPerPixel: (rangeEndMinutes - rangeStartMinutes) / tankHeight,
      startMinutes: segment.startMinutes,
      endMinutes: segment.endMinutes,
      latest: {
        startMinutes: segment.startMinutes,
        endMinutes: segment.endMinutes,
      },
      moved: false,
    };
    setDraft({
      startMinutes: segment.startMinutes,
      endMinutes: segment.endMinutes,
    });
  }

  function handleResizePointerMove(event: React.PointerEvent<HTMLSpanElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const deltaMinutes = (event.clientY - drag.originY) * drag.minutesPerPixel;
    let next: ResizeDraft;

    if (drag.edge === "start") {
      const snapped =
        Math.round((drag.startMinutes + deltaMinutes) / snapMinutes) *
        snapMinutes;
      const clamped = Math.min(
        Math.max(snapped, rangeStartMinutes),
        drag.endMinutes - minDurationMinutes
      );
      next = { startMinutes: clamped, endMinutes: drag.endMinutes };
    } else {
      const snapped =
        Math.round((drag.endMinutes + deltaMinutes) / snapMinutes) *
        snapMinutes;
      const clamped = Math.max(
        Math.min(snapped, rangeEndMinutes),
        drag.startMinutes + minDurationMinutes
      );
      next = { startMinutes: drag.startMinutes, endMinutes: clamped };
    }

    if (
      next.startMinutes !== drag.latest.startMinutes ||
      next.endMinutes !== drag.latest.endMinutes
    ) {
      drag.moved = true;
      drag.latest = next;
      setDraft(next);
    }
  }

  function handleResizePointerUp(event: React.PointerEvent<HTMLSpanElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    dragRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    setDraft(null);

    const changed =
      drag.moved &&
      (drag.latest.startMinutes !== drag.startMinutes ||
        drag.latest.endMinutes !== drag.endMinutes);

    if (changed) {
      onResize?.(segment, drag.latest);
    }
  }

  function resizeHandle(edge: ResizeEdge) {
    return (
      <span
        role="presentation"
        className={cn(
          "absolute inset-x-0 z-10 h-2 cursor-ns-resize touch-none",
          edge === "start" ? "top-0" : "bottom-0"
        )}
        onPointerDown={(event) => handleResizePointerDown(event, edge)}
        onPointerMove={handleResizePointerMove}
        onPointerUp={handleResizePointerUp}
        onPointerCancel={handleResizePointerUp}
        onClick={(event) => event.stopPropagation()}
      >
        <span
          aria-hidden
          className={cn(
            "absolute left-1/2 h-[3px] w-5 max-w-[70%] -translate-x-1/2 rounded-full bg-white/70 opacity-0 transition-opacity group-hover/segment:opacity-100 dark:bg-white/50",
            edge === "start" ? "top-[3px]" : "bottom-[3px]"
          )}
        />
      </span>
    );
  }

  const body = (
    <div
      className="relative h-full w-full overflow-hidden rounded-[0.65rem] shadow-sm ring-1 ring-black/5 transition-transform duration-150 group-hover/segment:scale-[1.02] dark:ring-white/10"
      style={{ background: liquidBackground(segment.color) }}
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-[3px] rounded-t-[0.65rem]"
        style={{ background: accent, opacity: 0.85 }}
      />
      <span
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.35)_0%,rgba(255,255,255,0.08)_38%,transparent_60%)]"
      />
      <span
        className="absolute inset-x-1 top-[5px] block truncate text-[10px] leading-tight font-medium"
        style={{ color: accent }}
      >
        {segment.label}
      </span>
      {resizable ? (
        <>
          {resizeHandle("start")}
          {resizeHandle("end")}
        </>
      ) : null}
    </div>
  );

  const totalRange = Math.max(rangeEndMinutes - rangeStartMinutes, 1);
  const topPercent = draft
    ? ((draft.startMinutes - rangeStartMinutes) / totalRange) * 100
    : placed.topPercent;
  const heightPercent = draft
    ? ((draft.endMinutes - draft.startMinutes) / totalRange) * 100
    : placed.heightPercent;

  const wrapperClassName = cn(
    "group/segment absolute px-[2px]",
    interactive ? "cursor-pointer" : "cursor-default"
  );
  const wrapperStyle = {
    top: `${topPercent}%`,
    height: `${heightPercent}%`,
    left: `${placed.leftPercent}%`,
    width: `${placed.widthPercent}%`,
    minHeight: "0.75rem",
    zIndex: draft ? 20 : undefined,
  } as const;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          interactive ? (
            <button
              type="button"
              className={cn(
                wrapperClassName,
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              )}
              style={wrapperStyle}
              onClick={() => onSelect?.(segment)}
              aria-label={`${segment.label}, ${timeRange}`}
            />
          ) : (
            <div
              className={wrapperClassName}
              style={wrapperStyle}
              aria-label={`${segment.label}, ${timeRange}`}
            />
          )
        }
      >
        {body}
      </TooltipTrigger>
      <TooltipContent side="top">
        <span className="flex flex-col gap-0.5">
          <span className="font-medium">{segment.label}</span>
          <span className="opacity-80">{timeRange}</span>
          {segment.sublabel ? (
            <span className="opacity-80">{segment.sublabel}</span>
          ) : null}
        </span>
      </TooltipContent>
    </Tooltip>
  );
}

function TankColumn({
  day,
  placed,
  marks,
  startMinutes,
  endMinutes,
  range,
  snapMinutes,
  minDurationMinutes,
  onSegmentSelect,
  onSegmentResize,
}: {
  day: ScheduleTankDay;
  placed: PlacedSegment[];
  marks: number[];
  startMinutes: number;
  endMinutes: number;
  range: number;
  snapMinutes: number;
  minDurationMinutes: number;
  onSegmentSelect?: (segment: ScheduleTankSegment) => void;
  onSegmentResize?: (
    segment: ScheduleTankSegment,
    next: { startMinutes: number; endMinutes: number }
  ) => void;
}) {
  const bodyRef = useRef<HTMLDivElement | null>(null);

  return (
    <div className="relative min-h-0 min-w-0 overflow-hidden rounded-[1.25rem] border border-border/70 bg-gradient-to-b from-muted/50 to-muted/20 shadow-inner">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-white/25 to-transparent dark:from-white/5"
      />
      {marks.map((minute) => (
        <span
          key={`grid-${day.key}-${minute}`}
          aria-hidden
          className="pointer-events-none absolute inset-x-0 border-t border-dashed border-border/50"
          style={{ top: `${((minute - startMinutes) / range) * 100}%` }}
        />
      ))}

      <div ref={bodyRef} className="absolute inset-1">
        {placed.map((item) => (
          <TankSegment
            key={item.segment.id}
            placed={item}
            tankRef={bodyRef}
            rangeStartMinutes={startMinutes}
            rangeEndMinutes={endMinutes}
            snapMinutes={snapMinutes}
            minDurationMinutes={minDurationMinutes}
            onSelect={onSegmentSelect}
            onResize={onSegmentResize}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Seven vertical "liquid tanks", one per weekday. Each tank spans a fixed time
 * range and every slot is drawn as coloured liquid at its proportional
 * position, so the tank itself reads as the schedule.
 */
export function ScheduleTanks({
  days,
  startMinutes = DEFAULT_START_MINUTES,
  endMinutes = DEFAULT_END_MINUTES,
  onSegmentSelect,
  onSegmentResize,
  snapMinutes = 15,
  minDurationMinutes = 15,
  className,
}: ScheduleTanksProps) {
  const range = Math.max(endMinutes - startMinutes, 1);
  const marks = useMemo(
    () => hourMarks(startMinutes, endMinutes),
    [startMinutes, endMinutes]
  );
  const placedByDay = useMemo(
    () =>
      days.map((day) => placeSegments(day.segments, startMinutes, endMinutes)),
    [days, startMinutes, endMinutes]
  );

  return (
    <TooltipProvider delay={120}>
      <div
        className={cn(
          "grid h-[60vh] min-h-[20rem] grid-cols-[2.5rem_repeat(7,minmax(0,1fr))] grid-rows-[auto_minmax(0,1fr)_auto] gap-x-1.5 gap-y-2 overflow-hidden sm:grid-cols-[3.25rem_repeat(7,minmax(0,1fr))] sm:gap-x-2.5",
          className
        )}
      >
        <div aria-hidden />
        {days.map((day) => (
          <div key={`head-${day.key}`} className="min-w-0 text-center">
            <span className="hidden text-sm font-medium tracking-tight lg:inline">
              {day.label}
            </span>
            <span className="text-xs font-medium tracking-tight lg:hidden">
              {day.shortLabel}
            </span>
          </div>
        ))}

        <div className="relative min-h-0 text-muted-foreground">
          {marks.map((minute) => (
            <span
              key={`axis-${minute}`}
              className="absolute right-0 -translate-y-1/2 text-[10px] tabular-nums sm:text-[11px]"
              style={{ top: `${((minute - startMinutes) / range) * 100}%` }}
            >
              {formatMinutesLabel(minute)}
            </span>
          ))}
        </div>

        {days.map((day, dayIndex) => (
          <TankColumn
            key={`tank-${day.key}`}
            day={day}
            placed={placedByDay[dayIndex] ?? []}
            marks={marks}
            startMinutes={startMinutes}
            endMinutes={endMinutes}
            range={range}
            snapMinutes={snapMinutes}
            minDurationMinutes={minDurationMinutes}
            onSegmentSelect={onSegmentSelect}
            onSegmentResize={onSegmentResize}
          />
        ))}

        <div aria-hidden />
        {days.map((day) => (
          <div
            key={`foot-${day.key}`}
            className="text-center text-[10px] text-muted-foreground sm:text-[11px]"
          >
            {day.segments.length === 0
              ? "—"
              : `${day.segments.length} slot${day.segments.length === 1 ? "" : "s"}`}
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
}
