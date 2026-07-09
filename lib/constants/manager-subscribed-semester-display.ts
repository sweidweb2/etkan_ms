import type { SubscribedSemesterStatusValue } from "@/lib/constants/manager-subscribed-semester-status";

export const MANAGER_SUBSCRIBED_SEMESTER_STATUS_LABELS: Record<
  SubscribedSemesterStatusValue,
  string
> = {
  active: "Active",
  pending: "Pending",
  cancelled: "Cancelled",
  overdue: "Overdue",
};

export const MANAGER_SUBSCRIBED_SEMESTER_STATUS_BADGE_CLASSES: Record<
  SubscribedSemesterStatusValue,
  string
> = {
  active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  cancelled: "bg-muted text-muted-foreground",
  overdue: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
};

export function formatAccountCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}
