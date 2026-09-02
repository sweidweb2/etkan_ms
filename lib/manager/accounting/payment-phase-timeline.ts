import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  eachMonthOfInterval,
  endOfMonth,
  format,
  startOfMonth,
} from "date-fns";
import { PAYMENT_PHASE_STATUSES } from "@/lib/manager/accounting/constants";
import type { ManagerPaymentPhaseRow } from "@/types/manager-payment-phase";

export type TimelineDomain = {
  /** Inclusive domain start as YYYY-MM-DD. */
  domainStart: string;
  /** Inclusive domain end as YYYY-MM-DD. */
  domainEnd: string;
};

export type TimelineMonthTick = {
  date: string;
  label: string;
  percent: number;
};

export type PhaseBarLayout = {
  leftPercent: number;
  widthPercent: number;
};

export type PhaseTimelineColor = {
  fill: string;
  accent: string;
};

/** Multi-hue pastels so overlapping / adjacent phases stay distinguishable. */
export const PHASE_TIMELINE_PALETTE: readonly PhaseTimelineColor[] = [
  { fill: "#bfdbfe", accent: "#2563eb" },
  { fill: "#bbf7d0", accent: "#16a34a" },
  { fill: "#fde68a", accent: "#d97706" },
  { fill: "#fecaca", accent: "#dc2626" },
  { fill: "#e9d5ff", accent: "#9333ea" },
  { fill: "#a5f3fc", accent: "#0891b7" },
  { fill: "#fbcfe8", accent: "#db2777" },
  { fill: "#c7d2fe", accent: "#4f46e5" },
  { fill: "#d9f99d", accent: "#65a30d" },
  { fill: "#fed7aa", accent: "#ea580c" },
] as const;

const MAX_MONTH_TICKS = 8;

/** Parse YYYY-MM-DD (or timestamp prefix) as a local calendar Date at midnight. */
export function parseTimelineDate(value: string): Date | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

export function toTimelineIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function filterOpenPhases(
  phases: ManagerPaymentPhaseRow[]
): ManagerPaymentPhaseRow[] {
  return phases
    .filter((phase) => phase.status === PAYMENT_PHASE_STATUSES.OPENED)
    .slice()
    .sort((a, b) => {
      const startCompare = a.start_date.localeCompare(b.start_date);
      if (startCompare !== 0) {
        return startCompare;
      }
      return a.name.localeCompare(b.name);
    });
}

/**
 * Shared time domain covering all open phase ranges and today, snapped outward
 * to month boundaries so axis ticks land cleanly.
 */
export function buildTimelineDomain(
  phases: Pick<ManagerPaymentPhaseRow, "start_date" | "end_date">[],
  today: Date = new Date()
): TimelineDomain | null {
  const todayLocal = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const bounds: Date[] = [todayLocal];

  for (const phase of phases) {
    const start = parseTimelineDate(phase.start_date);
    const end = parseTimelineDate(phase.end_date);
    if (start) {
      bounds.push(start);
    }
    if (end) {
      bounds.push(end);
    }
  }

  if (bounds.length === 0) {
    return null;
  }

  const earliest = bounds.reduce((min, date) =>
    date.getTime() < min.getTime() ? date : min
  );
  const latest = bounds.reduce((max, date) =>
    date.getTime() > max.getTime() ? date : max
  );

  const domainStart = startOfMonth(earliest);
  let domainEnd = endOfMonth(latest);

  // Guarantee at least one full day of span for percent math.
  if (domainEnd.getTime() <= domainStart.getTime()) {
    domainEnd = endOfMonth(addMonths(domainStart, 1));
  }

  return {
    domainStart: toTimelineIsoDate(domainStart),
    domainEnd: toTimelineIsoDate(domainEnd),
  };
}

export function dateToPercent(
  dateValue: string | Date,
  domain: TimelineDomain
): number {
  const date =
    typeof dateValue === "string" ? parseTimelineDate(dateValue) : dateValue;
  const domainStart = parseTimelineDate(domain.domainStart);
  const domainEnd = parseTimelineDate(domain.domainEnd);

  if (!date || !domainStart || !domainEnd) {
    return 0;
  }

  const totalDays = differenceInCalendarDays(domainEnd, domainStart);
  if (totalDays <= 0) {
    return 0;
  }

  const offsetDays = differenceInCalendarDays(date, domainStart);
  const percent = (offsetDays / totalDays) * 100;
  return Math.min(100, Math.max(0, percent));
}

/**
 * Inclusive bar from start_date through end_date on the shared domain.
 * Zero-length ranges still get a small visible width.
 */
export function phaseBarLayout(
  phase: Pick<ManagerPaymentPhaseRow, "start_date" | "end_date">,
  domain: TimelineDomain
): PhaseBarLayout | null {
  const start = parseTimelineDate(phase.start_date);
  const end = parseTimelineDate(phase.end_date);
  const domainStart = parseTimelineDate(domain.domainStart);
  const domainEnd = parseTimelineDate(domain.domainEnd);

  if (!start || !end || !domainStart || !domainEnd) {
    return null;
  }

  const clampedStart =
    start.getTime() < domainStart.getTime() ? domainStart : start;
  const clampedEnd = end.getTime() > domainEnd.getTime() ? domainEnd : end;

  if (clampedEnd.getTime() < clampedStart.getTime()) {
    return null;
  }

  const totalDays = differenceInCalendarDays(domainEnd, domainStart);
  if (totalDays <= 0) {
    return null;
  }

  // Inclusive end day: treat the bar as covering through end of end_date.
  const exclusiveEnd = addDays(clampedEnd, 1);
  const leftDays = differenceInCalendarDays(clampedStart, domainStart);
  const widthDays = Math.max(
    1,
    differenceInCalendarDays(exclusiveEnd, clampedStart)
  );

  const leftPercent = (leftDays / totalDays) * 100;
  const widthPercent = (widthDays / totalDays) * 100;

  return {
    leftPercent: Math.min(100, Math.max(0, leftPercent)),
    widthPercent: Math.min(100 - leftPercent, Math.max(0.5, widthPercent)),
  };
}

export function buildMonthTicks(domain: TimelineDomain): TimelineMonthTick[] {
  const domainStart = parseTimelineDate(domain.domainStart);
  const domainEnd = parseTimelineDate(domain.domainEnd);

  if (!domainStart || !domainEnd) {
    return [];
  }

  const months = eachMonthOfInterval({
    start: domainStart,
    end: domainEnd,
  });

  const step = Math.max(1, Math.ceil(months.length / MAX_MONTH_TICKS));
  const kept: Date[] = [];

  months.forEach((date, index) => {
    const isLast = index === months.length - 1;
    if (index % step !== 0 && !isLast) {
      return;
    }

    const previous = kept[kept.length - 1];
    if (
      previous &&
      previous.getFullYear() === date.getFullYear() &&
      previous.getMonth() === date.getMonth()
    ) {
      return;
    }

    kept.push(date);
  });

  return kept.map((date) => ({
    date: toTimelineIsoDate(date),
    label: format(date, "MMM yyyy"),
    percent: dateToPercent(date, domain),
  }));
}

function hashPhaseId(id: string): number {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }
  return hash;
}

/** Stable palette color from phase id so refresh / reorder does not reshuffle. */
export function colorForPhaseId(id: string): PhaseTimelineColor {
  const index = hashPhaseId(id) % PHASE_TIMELINE_PALETTE.length;
  return PHASE_TIMELINE_PALETTE[index]!;
}
