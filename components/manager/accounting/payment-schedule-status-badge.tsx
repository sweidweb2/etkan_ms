import {
  PAYMENT_SCHEDULE_STATUS_LABELS,
  type PaymentScheduleStatus,
} from "@/lib/manager/accounting/constants";
import { cn } from "@/lib/utils";

type PaymentScheduleStatusBadgeProps = {
  status: PaymentScheduleStatus;
  isOverdue?: boolean;
  className?: string;
};

const STATUS_BADGE_CLASSES: Record<PaymentScheduleStatus, string> = {
  planned: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  paid: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  waived: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  cancelled: "bg-muted text-muted-foreground",
};

export function PaymentScheduleStatusBadge({
  status,
  isOverdue = false,
  className,
}: PaymentScheduleStatusBadgeProps) {
  if (isOverdue) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
          "bg-amber-500/15 text-amber-800 dark:text-amber-200",
          className
        )}
      >
        Overdue
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        STATUS_BADGE_CLASSES[status],
        className
      )}
    >
      {PAYMENT_SCHEDULE_STATUS_LABELS[status]}
    </span>
  );
}
