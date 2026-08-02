import {
  MANAGER_WORKSHOP_STATUS_BADGE_CLASSES,
  MANAGER_WORKSHOP_STATUS_LABELS,
} from "@/lib/constants/manager-workshop-display";
import type { WorkshopStatusValue } from "@/lib/constants/manager-workshop-status";
import { cn } from "@/lib/utils";

type WorkshopStatusBadgeProps = {
  status: WorkshopStatusValue;
  className?: string;
};

export function WorkshopStatusBadge({
  status,
  className,
}: WorkshopStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        MANAGER_WORKSHOP_STATUS_BADGE_CLASSES[status],
        className
      )}
    >
      {MANAGER_WORKSHOP_STATUS_LABELS[status]}
    </span>
  );
}
