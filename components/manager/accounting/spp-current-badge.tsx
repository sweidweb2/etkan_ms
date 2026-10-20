import {
  SPP_CURRENT_CLEARANCE_BADGE_CLASS,
  SPP_CURRENT_CLEARANCE_LABEL,
} from "@/lib/constants/manager-payment-phase-display";
import { cn } from "@/lib/utils";
import type { ManagerSppClearanceDto } from "@/types/manager-spp-clearance";

type SppCurrentBadgeProps = {
  clearance: ManagerSppClearanceDto | null | undefined;
  className?: string;
};

export function SppCurrentBadge({
  clearance,
  className,
}: SppCurrentBadgeProps) {
  if (!clearance?.is_active) {
    return null;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        SPP_CURRENT_CLEARANCE_BADGE_CLASS,
        className
      )}
    >
      {SPP_CURRENT_CLEARANCE_LABEL}
    </span>
  );
}
