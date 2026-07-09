import {
  MANAGER_SUBSCRIBED_SEMESTER_STATUS_BADGE_CLASSES,
  MANAGER_SUBSCRIBED_SEMESTER_STATUS_LABELS,
} from "@/lib/constants/manager-subscribed-semester-display";
import type { SubscribedSemesterStatusValue } from "@/lib/constants/manager-subscribed-semester-status";
import { cn } from "@/lib/utils";

type SubscribedSemesterStatusBadgeProps = {
  status: SubscribedSemesterStatusValue;
  className?: string;
};

export function SubscribedSemesterStatusBadge({
  status,
  className,
}: SubscribedSemesterStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
        MANAGER_SUBSCRIBED_SEMESTER_STATUS_BADGE_CLASSES[status],
        className
      )}
    >
      {MANAGER_SUBSCRIBED_SEMESTER_STATUS_LABELS[status]}
    </span>
  );
}
