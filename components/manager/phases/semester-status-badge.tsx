import {
  MANAGER_SEMESTER_STATUS_BADGE_CLASSES,
  MANAGER_SEMESTER_STATUS_LABELS,
} from "@/lib/constants/manager-phase-display";
import type { SemesterStatusValue } from "@/lib/constants/manager-semester-status";
import { cn } from "@/lib/utils";

type SemesterStatusBadgeProps = {
  status: SemesterStatusValue;
  className?: string;
};

export function SemesterStatusBadge({
  status,
  className,
}: SemesterStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        MANAGER_SEMESTER_STATUS_BADGE_CLASSES[status],
        className
      )}
    >
      {MANAGER_SEMESTER_STATUS_LABELS[status]}
    </span>
  );
}
