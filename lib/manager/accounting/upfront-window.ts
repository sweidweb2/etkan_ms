import { Temporal } from "temporal-polyfill";
import { APP_TIMEZONE } from "@/lib/constants/timezone";
import {
  PAYMENT_PHASE_STATUSES,
  STUDENT_PAYMENT_PHASE_STATUSES,
} from "@/lib/manager/accounting/constants";

export type UpfrontWindowPhase = {
  status: string;
  start_date: string;
  upfront_amount: number;
};

export type UpfrontPaidInput = {
  status: string;
  totalPaid: number;
  upfrontAmount: number;
};

/** Parse a date or timestamp column into a plain calendar date. */
export function toPlainDate(value: string): Temporal.PlainDate | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return Temporal.PlainDate.from(trimmed.slice(0, 10));
  } catch {
    return null;
  }
}

/**
 * Opened phase with an upfront amount, still inside its first month.
 *
 * The window is `[start_date, start_date + 1 month)` against today in
 * {@link APP_TIMEZONE}, so managers in different timezones see the same mode.
 */
export function isPhaseUpfrontWindowActive(
  phase: UpfrontWindowPhase,
  now?: Temporal.PlainDate
): boolean {
  if (phase.status !== PAYMENT_PHASE_STATUSES.OPENED) {
    return false;
  }

  if (!(phase.upfront_amount > 0)) {
    return false;
  }

  const startDate = toPlainDate(phase.start_date);
  if (!startDate) {
    return false;
  }

  const today = now ?? Temporal.Now.plainDateISO(APP_TIMEZONE);
  const windowEnd = startDate.add({ months: 1 });

  return (
    Temporal.PlainDate.compare(today, startDate) >= 0 &&
    Temporal.PlainDate.compare(today, windowEnd) < 0
  );
}

/**
 * Numerator predicate while a phase is in upfront mode.
 *
 * Adjustments are ignored on purpose: the upfront is a phase-level amount, so
 * it is compared against the raw paid total. Fully settled students still
 * count even when a discount pushed their due below the upfront.
 */
export function countsAsUpfrontPaid({
  status,
  totalPaid,
  upfrontAmount,
}: UpfrontPaidInput): boolean {
  if (status === STUDENT_PAYMENT_PHASE_STATUSES.CANCELLED) {
    return false;
  }

  if (status === STUDENT_PAYMENT_PHASE_STATUSES.PAID) {
    return true;
  }

  return upfrontAmount > 0 && totalPaid >= upfrontAmount;
}
