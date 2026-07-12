import type { SubscribedSemesterStatusValue } from "@/lib/constants/manager-subscribed-semester-status";

export const MANAGER_SUBSCRIBED_SEMESTER_STATUS_LABELS: Record<
  SubscribedSemesterStatusValue,
  string
> = {
  pending: "Pending",
  paid: "Paid",
  paused: "Paused",
  stopped: "Stopped",
  refunded: "Refunded",
};

export const MANAGER_SUBSCRIBED_SEMESTER_STATUS_BADGE_CLASSES: Record<
  SubscribedSemesterStatusValue,
  string
> = {
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  paid: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  paused: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  stopped: "bg-muted text-muted-foreground",
  refunded: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
};

export function formatAccountCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}
