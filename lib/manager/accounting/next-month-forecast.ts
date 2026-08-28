import { Temporal } from "temporal-polyfill";
import { APP_TIMEZONE } from "@/lib/constants/timezone";
import {
  PAYMENT_PHASE_STATUSES,
  TRANSACTION_TYPES,
} from "@/lib/manager/accounting/constants";
import { toPlainDate } from "@/lib/manager/accounting/upfront-window";
import type { IsoDateRange } from "@/lib/utils/iso-date-range";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export type ForecastPhase = {
  status: string;
  start_date: string;
  end_date: string;
  upfront_amount: number;
  duration_months: number;
};

export type ForecastSpp = {
  remaining_amount: number;
  final_amount_due: number;
};

export type ForecastCreditRow = {
  type: string;
  amount: number;
};

export type NextMonth = {
  monthStart: Temporal.PlainDate;
  label: string;
};

/** First day of next month in {@link APP_TIMEZONE}, with a "October 2026" label. */
export function nextMonthStart(today?: Temporal.PlainDate): NextMonth {
  const base = today ?? Temporal.Now.plainDateISO(APP_TIMEZONE);
  const monthStart = base.with({ day: 1 }).add({ months: 1 });

  return {
    monthStart,
    label: `${MONTH_NAMES[monthStart.month - 1]} ${monthStart.year}`,
  };
}

/**
 * The phase starts inside the month beginning at `monthStart`, so that month is
 * its first month and the upfront is what students are asked to pay.
 *
 * This is a calendar-month test rather than the rolling window used by
 * `isPhaseUpfrontWindowActive`: a phase starting on the 5th belongs to that
 * whole month, and only to that month.
 */
export function isFirstMonthOfPhase(
  phase: Pick<ForecastPhase, "status" | "start_date" | "upfront_amount">,
  monthStart: Temporal.PlainDate
): boolean {
  if (phase.status !== PAYMENT_PHASE_STATUSES.OPENED) {
    return false;
  }

  if (!(Number(phase.upfront_amount) > 0)) {
    return false;
  }

  const startDate = toPlainDate(phase.start_date);
  if (!startDate) {
    return false;
  }

  const monthEnd = monthStart.add({ months: 1 });

  return (
    Temporal.PlainDate.compare(startDate, monthStart) >= 0 &&
    Temporal.PlainDate.compare(startDate, monthEnd) < 0
  );
}

/** The phase is still collecting in the month starting at `monthStart`. */
export function phaseRunsInMonth(
  phase: Pick<ForecastPhase, "end_date">,
  monthStart: Temporal.PlainDate
): boolean {
  const endDate = toPlainDate(phase.end_date);
  if (!endDate) {
    return false;
  }

  return Temporal.PlainDate.compare(endDate, monthStart) >= 0;
}

/**
 * Money we expect a single student to pay during the month starting at
 * `monthStart`.
 *
 * Settled students contribute nothing. When that month is the phase's first
 * month and the phase has an upfront, we expect the upfront instead of a
 * monthly slice. Otherwise it is one installment of `final_amount_due`, which
 * already reflects scholarships and discounts. Every case is capped by what is
 * actually left to pay.
 */
export function expectedSppAmountForMonth(
  spp: ForecastSpp,
  phase: ForecastPhase,
  monthStart: Temporal.PlainDate
): number {
  const remaining = Number(spp.remaining_amount);
  if (!(remaining > 0)) {
    return 0;
  }

  if (isFirstMonthOfPhase(phase, monthStart)) {
    return Math.min(remaining, Math.max(0, Number(phase.upfront_amount)));
  }

  const durationMonths = Math.max(Number(phase.duration_months) || 1, 1);
  const monthlyDue = Number(spp.final_amount_due) / durationMonths;

  return Math.min(remaining, Math.max(0, monthlyDue));
}

/** Average credit inflow per month across the sampled window. */
export function averageMonthlyCredits(
  rows: ForecastCreditRow[],
  monthsSampled: number
): number {
  const months = Math.max(monthsSampled, 1);
  const total = rows.reduce(
    (sum, row) =>
      row.type === TRANSACTION_TYPES.CREDIT ? sum + Number(row.amount) : sum,
    0
  );

  return total / months;
}

/**
 * Bounds covering the given number of completed months before the current one.
 * The current month is excluded because it is still in progress.
 */
export function lastCompletedMonthsRange(
  months: number,
  today?: Temporal.PlainDate
): IsoDateRange {
  const base = today ?? Temporal.Now.plainDateISO(APP_TIMEZONE);
  const currentMonthStart = base.with({ day: 1 });
  const from = currentMonthStart.subtract({ months: Math.max(months, 1) });

  return {
    fromInclusive: from.toString(),
    toExclusive: currentMonthStart.toString(),
  };
}
