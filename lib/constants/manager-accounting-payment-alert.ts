import { SUBSCRIBED_SEMESTER_STATUSES } from "@/lib/constants/manager-subscribed-semester-status";
import { getSubscriptionBillingGate } from "@/lib/manager/subscribed-semester-billing";
import type {
  ManagerAccountingPaymentAlertReason,
  ManagerAccountingPaymentMissedMonths,
} from "@/types/manager-student-semester";

/** Alert when semester enrollment paid total is below this amount (USD). */
export const ACCOUNTING_PAYMENT_ALERT_MIN_AMOUNT = 100;

export const ACCOUNTING_PAYMENT_MISSED_MONTH_LEVELS: ManagerAccountingPaymentMissedMonths[] =
  [1, 2, 3, 4, 5, 6];

export const ACCOUNTING_PAYMENT_MISSED_MONTH_REASONS: Record<
  ManagerAccountingPaymentMissedMonths,
  ManagerAccountingPaymentAlertReason
> = {
  1: "no_payment_1_month",
  2: "no_payment_2_months",
  3: "no_payment_3_months",
  4: "no_payment_4_months",
  5: "no_payment_5_months",
  6: "no_payment_6_months",
};

/** Billing statuses that are closed — not evaluated for payment alerts. */
export const ACCOUNTING_CLOSED_SUBSCRIPTION_STATUSES = [
  SUBSCRIBED_SEMESTER_STATUSES.PAID,
  SUBSCRIBED_SEMESTER_STATUSES.PAUSED,
  SUBSCRIBED_SEMESTER_STATUSES.STOPPED,
  SUBSCRIBED_SEMESTER_STATUSES.REFUNDED,
] as const;

export function isOpenBillingSubscriptionStatus(
  status: string | null | undefined
): boolean {
  if (!status) {
    return false;
  }

  if (status === SUBSCRIBED_SEMESTER_STATUSES.PENDING) {
    return true;
  }

  return !(ACCOUNTING_CLOSED_SUBSCRIPTION_STATUSES as readonly string[]).includes(
    status
  );
}

/**
 * Open for manage-account payment alerts: pending (etc.) and still has remaining due.
 * Fully covered rows (including 100% scholarship / special total 0) are excluded.
 */
export function isSubscriptionOpenForPaymentAlerts(input: {
  status: string | null | undefined;
  subscriptionAmount: number;
  totalPaid: number;
  activeSpecialCaseTotalAmount?: number | null;
}): boolean {
  if (!isOpenBillingSubscriptionStatus(input.status)) {
    return false;
  }

  const gate = getSubscriptionBillingGate({
    status: input.status,
    subscriptionAmount: input.subscriptionAmount,
    totalPaid: input.totalPaid,
    activeSpecialCaseTotalAmount: input.activeSpecialCaseTotalAmount,
  });

  return gate.remainingDue > 0;
}

export function isPaymentInCurrentMonthWindow(
  paidAt: string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!paidAt) {
    return false;
  }

  const paid = new Date(paidAt);
  if (Number.isNaN(paid.getTime())) {
    return false;
  }

  return isDateInCurrentMonthWindow(paid, now);
}

function isDateInCurrentMonthWindow(paid: Date, now: Date): boolean {
  const day = paid.getDate();

  return (
    paid.getFullYear() === now.getFullYear() &&
    paid.getMonth() === now.getMonth() &&
    day >= 1 &&
    day <= 30
  );
}

function getCalendarMonthsBetween(from: Date, to: Date): number {
  return (
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth())
  );
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Highest missed-payment severity (1–6), or null when a payment exists
 * in the current month window (days 1–30).
 */
export function getPaymentMissedMonthsSeverity(
  paidAts: Array<string | null | undefined>,
  now: Date = new Date()
): ManagerAccountingPaymentMissedMonths | null {
  const validDates = paidAts
    .map((paidAt) => (paidAt ? new Date(paidAt) : null))
    .filter((date): date is Date => date !== null && !Number.isNaN(date.getTime()));

  if (validDates.some((date) => isDateInCurrentMonthWindow(date, now))) {
    return null;
  }

  if (validDates.length === 0) {
    return 6;
  }

  const latestPayment = validDates.reduce((latest, date) =>
    date.getTime() > latest.getTime() ? date : latest
  );
  const monthsSince = getCalendarMonthsBetween(latestPayment, now);

  return Math.min(6, Math.max(1, monthsSince)) as ManagerAccountingPaymentMissedMonths;
}

export type ResolveManageAccountingAlertInput = {
  /** Count of account subscriptions still open for billing (typically pending). */
  openBillingCount: number;
  /**
   * When openBillingCount === 1, pass true only for the row that matches
   * that open subscription’s semester (or account-level rows with no enrollment).
   */
  isFocusOpenSubscription?: boolean;
  totalPaid?: number | null;
  paidAts?: Array<string | null | undefined>;
  semesterAmount?: number | null;
  activeSpecialCaseTotalAmount?: number | null;
  hasScheduledPayments?: boolean;
  hasMissedScheduledPayment?: boolean;
  now?: Date;
};

export type ResolveManageAccountingAlertResult = {
  payment_alert: boolean;
  low_payment: boolean;
  payment_missed_months: ManagerAccountingPaymentMissedMonths | null;
  payment_alert_reasons: ManagerAccountingPaymentAlertReason[];
};

const EMPTY_ALERT: ResolveManageAccountingAlertResult = {
  payment_alert: false,
  low_payment: false,
  payment_missed_months: null,
  payment_alert_reasons: [],
};

function withReasons(
  reasons: ManagerAccountingPaymentAlertReason[],
  options?: { payment_alert?: boolean }
): ResolveManageAccountingAlertResult {
  const paymentMissedMonths =
    reasons
      .map((reason) => {
        const entry = Object.entries(ACCOUNTING_PAYMENT_MISSED_MONTH_REASONS).find(
          ([, value]) => value === reason
        );
        return entry ? (Number(entry[0]) as ManagerAccountingPaymentMissedMonths) : null;
      })
      .find((level) => level !== null) ?? null;

  const lowPayment = reasons.includes("low_payment");
  const needsAttention = reasons.some((reason) => reason !== "done");

  return {
    payment_alert: options?.payment_alert ?? (needsAttention && reasons.length > 0),
    low_payment: lowPayment,
    payment_missed_months: paymentMissedMonths,
    payment_alert_reasons: reasons,
  };
}

function appendMissedMonthReasons(
  reasons: ManagerAccountingPaymentAlertReason[],
  paidAts: Array<string | null | undefined>,
  now: Date
) {
  const missed = getPaymentMissedMonthsSeverity(paidAts, now);
  if (missed !== null) {
    reasons.push(ACCOUNTING_PAYMENT_MISSED_MONTH_REASONS[missed]);
  }
  return missed;
}

function appendScheduleReasons(
  reasons: ManagerAccountingPaymentAlertReason[],
  hasMissedScheduledPayment: boolean
) {
  reasons.push(hasMissedScheduledPayment ? "missed_schedule" : "scheduled");
}

/**
 * Manage-accounting Alert column rules:
 * - 0 open billing subs → none
 * - >1 open → complex
 * - 1 open → special-case / schedule / under-$100 / L1–L6 rules
 */
export function resolveManageAccountingAlert(
  input: ResolveManageAccountingAlertInput
): ResolveManageAccountingAlertResult {
  const openCount = input.openBillingCount;

  if (openCount <= 0) {
    return EMPTY_ALERT;
  }

  if (openCount > 1) {
    return withReasons(["complex"], { payment_alert: true });
  }

  if (input.isFocusOpenSubscription === false) {
    return EMPTY_ALERT;
  }

  const now = input.now ?? new Date();
  const totalPaid = roundCurrency(Number(input.totalPaid ?? 0));
  const paidAts = input.paidAts ?? [];
  const hasScheduled = Boolean(input.hasScheduledPayments);
  const hasMissed = Boolean(input.hasMissedScheduledPayment);
  const specialOwed =
    input.activeSpecialCaseTotalAmount === null ||
    input.activeSpecialCaseTotalAmount === undefined
      ? null
      : roundCurrency(Number(input.activeSpecialCaseTotalAmount));
  const semesterAmount =
    input.semesterAmount === null || input.semesterAmount === undefined
      ? null
      : roundCurrency(Number(input.semesterAmount));

  if (specialOwed !== null) {
    // Covered when paid meets special owed (0 = 100% scholarship → always covered).
    if (totalPaid >= specialOwed) {
      return withReasons(["done"], { payment_alert: false });
    }

    const reasons: ManagerAccountingPaymentAlertReason[] = [];
    if (hasScheduled) {
      appendScheduleReasons(reasons, hasMissed);
    } else if (totalPaid === 0 || getPaymentMissedMonthsSeverity(paidAts, now) !== null) {
      appendMissedMonthReasons(reasons, paidAts, now);
    }

    return withReasons(reasons);
  }

  if (semesterAmount !== null && totalPaid >= semesterAmount) {
    return withReasons(["done"], { payment_alert: false });
  }

  const reasons: ManagerAccountingPaymentAlertReason[] = [];

  if (totalPaid < ACCOUNTING_PAYMENT_ALERT_MIN_AMOUNT) {
    reasons.push("low_payment");
  }

  if (hasScheduled) {
    appendScheduleReasons(reasons, hasMissed);
  } else {
    appendMissedMonthReasons(reasons, paidAts, now);
  }

  return withReasons(reasons);
}

/** @deprecated Prefer resolveManageAccountingAlert for list/details. */
export function getAccountingPaymentAlert(input: {
  semesterId: string | null;
  totalPaid: number | null;
  paidAts: Array<string | null | undefined>;
  now?: Date;
}): ResolveManageAccountingAlertResult {
  if (!input.semesterId) {
    return EMPTY_ALERT;
  }

  return resolveManageAccountingAlert({
    openBillingCount: 1,
    isFocusOpenSubscription: true,
    totalPaid: input.totalPaid,
    paidAts: input.paidAts,
    now: input.now,
  });
}

export const ACCOUNTING_PAYMENT_ALERT_REASON_LABELS: Record<
  ManagerAccountingPaymentAlertReason,
  string
> = {
  complex: "Complex situation",
  done: "Done",
  scheduled: "Scheduled",
  missed_schedule: "Missed schedule",
  low_payment: `Under $${ACCOUNTING_PAYMENT_ALERT_MIN_AMOUNT} paid`,
  no_payment_1_month: "No payment this month",
  no_payment_2_months: "No payment in the last 2 months",
  no_payment_3_months: "No payment in the last 3 months",
  no_payment_4_months: "No payment in the last 4 months",
  no_payment_5_months: "No payment in the last 5 months",
  no_payment_6_months: "No payment in the last 6 months",
};

export const ACCOUNTING_PAYMENT_MISSED_MONTH_LABELS: Record<
  ManagerAccountingPaymentMissedMonths,
  string
> = {
  1: "No payment this month",
  2: "No payment in the last 2 months",
  3: "No payment in the last 3 months",
  4: "No payment in the last 4 months",
  5: "No payment in the last 5 months",
  6: "No payment in the last 6 months",
};

export const ACCOUNTING_PAYMENT_MISSED_MONTH_BADGE_CLASSES: Record<
  ManagerAccountingPaymentMissedMonths,
  string
> = {
  1: "bg-amber-500/15 text-amber-800 dark:text-amber-200",
  2: "bg-orange-500/15 text-orange-800 dark:text-orange-200",
  3: "bg-orange-600/20 text-orange-900 dark:text-orange-200",
  4: "bg-rose-500/15 text-rose-800 dark:text-rose-200",
  5: "bg-rose-600/20 text-rose-900 dark:text-rose-200",
  6: "bg-red-700/20 text-red-900 dark:text-red-200",
};
