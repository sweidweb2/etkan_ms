import {
  SPP_STATUS_BADGE_CLASSES,
  SPP_STATUS_LABELS,
} from "@/lib/constants/manager-payment-phase-display";
import type { StudentPaymentPhaseStatus } from "@/lib/manager/accounting/constants";
import { cn } from "@/lib/utils";

type SppStatusBadgeProps = {
  status: StudentPaymentPhaseStatus;
  className?: string;
};

export function SppStatusBadge({ status, className }: SppStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        SPP_STATUS_BADGE_CLASSES[status],
        className
      )}
    >
      {SPP_STATUS_LABELS[status]}
    </span>
  );
}
