import {
  MANAGER_SCHEDULED_PAYMENT_STATUS_BADGE_CLASSES,
  MANAGER_SCHEDULED_PAYMENT_STATUS_LABELS,
} from "@/lib/constants/manager-scheduled-payment-display";
import type { ScheduledPaymentStatusValue } from "@/lib/constants/manager-scheduled-payment-status";
import { cn } from "@/lib/utils";

type ScheduledPaymentStatusBadgeProps = {
  status: ScheduledPaymentStatusValue;
  className?: string;
};

export function ScheduledPaymentStatusBadge({
  status,
  className,
}: ScheduledPaymentStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
        MANAGER_SCHEDULED_PAYMENT_STATUS_BADGE_CLASSES[status],
        className
      )}
    >
      {MANAGER_SCHEDULED_PAYMENT_STATUS_LABELS[status]}
    </span>
  );
}
