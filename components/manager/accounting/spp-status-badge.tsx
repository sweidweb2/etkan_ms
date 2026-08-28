import {
  SPP_DISPLAY_STATUS_BADGE_CLASSES,
  SPP_DISPLAY_STATUS_LABELS,
  type SppDisplayStatus,
} from "@/lib/constants/manager-payment-phase-display";
import { cn } from "@/lib/utils";

type SppStatusBadgeProps = {
  status: SppDisplayStatus;
  className?: string;
};

export function SppStatusBadge({ status, className }: SppStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        SPP_DISPLAY_STATUS_BADGE_CLASSES[status],
        className
      )}
    >
      {SPP_DISPLAY_STATUS_LABELS[status]}
    </span>
  );
}
