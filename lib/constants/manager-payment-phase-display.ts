import {
  PAYMENT_PHASE_STATUSES,
  STUDENT_PAYMENT_PHASE_STATUSES,
  type PaymentPhaseStatus,
  type StudentPaymentPhaseStatus,
} from "@/lib/manager/accounting/constants";

export const PAYMENT_PHASE_STATUS_LABELS: Record<PaymentPhaseStatus, string> = {
  [PAYMENT_PHASE_STATUSES.OPENED]: "Opened",
  [PAYMENT_PHASE_STATUSES.CLOSED]: "Closed",
  [PAYMENT_PHASE_STATUSES.CANCELLED]: "Cancelled",
};

export const PAYMENT_PHASE_STATUS_BADGE_CLASSES: Record<
  PaymentPhaseStatus,
  string
> = {
  [PAYMENT_PHASE_STATUSES.OPENED]:
    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  [PAYMENT_PHASE_STATUSES.CLOSED]:
    "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  [PAYMENT_PHASE_STATUSES.CANCELLED]:
    "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};

export const SPP_STATUS_LABELS: Record<StudentPaymentPhaseStatus, string> = {
  [STUDENT_PAYMENT_PHASE_STATUSES.PENDING]: "Pending",
  [STUDENT_PAYMENT_PHASE_STATUSES.PARTIALLY_PAID]: "Partially paid",
  [STUDENT_PAYMENT_PHASE_STATUSES.PAID]: "Paid",
  [STUDENT_PAYMENT_PHASE_STATUSES.CANCELLED]: "Cancelled",
};

export const SPP_STATUS_BADGE_CLASSES: Record<
  StudentPaymentPhaseStatus,
  string
> = {
  [STUDENT_PAYMENT_PHASE_STATUSES.PENDING]:
    "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  [STUDENT_PAYMENT_PHASE_STATUSES.PARTIALLY_PAID]:
    "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  [STUDENT_PAYMENT_PHASE_STATUSES.PAID]:
    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  [STUDENT_PAYMENT_PHASE_STATUSES.CANCELLED]:
    "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};

/** Display-only status: paid the upfront while the phase is in its first month. */
export const SPP_UPFRONT_PAID_DISPLAY_STATUS = "upfront_paid" as const;

export type SppDisplayStatus =
  | StudentPaymentPhaseStatus
  | typeof SPP_UPFRONT_PAID_DISPLAY_STATUS;

export const SPP_DISPLAY_STATUS_LABELS: Record<SppDisplayStatus, string> = {
  ...SPP_STATUS_LABELS,
  [SPP_UPFRONT_PAID_DISPLAY_STATUS]: "Upfront paid",
};

export const SPP_DISPLAY_STATUS_BADGE_CLASSES: Record<
  SppDisplayStatus,
  string
> = {
  ...SPP_STATUS_BADGE_CLASSES,
  [SPP_UPFRONT_PAID_DISPLAY_STATUS]:
    "bg-teal-500/15 text-teal-700 dark:text-teal-300",
};

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatPaymentPhaseMoney(value: number): string {
  return moneyFormatter.format(value);
}
