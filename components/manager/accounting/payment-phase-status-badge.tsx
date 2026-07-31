import {
  PAYMENT_PHASE_STATUS_BADGE_CLASSES,
  PAYMENT_PHASE_STATUS_LABELS,
} from "@/lib/constants/manager-payment-phase-display";
import type { PaymentPhaseStatus } from "@/lib/manager/accounting/constants";
import { cn } from "@/lib/utils";

type PaymentPhaseStatusBadgeProps = {
  status: PaymentPhaseStatus;
  className?: string;
};

export function PaymentPhaseStatusBadge({
  status,
  className,
}: PaymentPhaseStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        PAYMENT_PHASE_STATUS_BADGE_CLASSES[status],
        className
      )}
    >
      {PAYMENT_PHASE_STATUS_LABELS[status]}
    </span>
  );
}
