import type { ScheduledPaymentStatusValue } from "@/lib/constants/manager-scheduled-payment-status";

export const MANAGER_SCHEDULED_PAYMENT_STATUS_LABELS: Record<
  ScheduledPaymentStatusValue,
  string
> = {
  scheduled: "Scheduled",
  reminded: "Reminded",
  completed: "Completed",
  missed: "Missed",
  cancelled: "Cancelled",
};

export const MANAGER_SCHEDULED_PAYMENT_STATUS_BADGE_CLASSES: Record<
  ScheduledPaymentStatusValue,
  string
> = {
  scheduled: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  reminded: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  completed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  missed: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
  cancelled: "bg-muted text-muted-foreground",
};

export const MANAGER_SCHEDULED_PAYMENT_TABLE_LIMITS = {
  note: 48,
} as const;
