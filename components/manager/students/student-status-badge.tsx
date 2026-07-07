import {
  MANAGER_STUDENT_STATUS_BADGE_CLASSES,
  MANAGER_STUDENT_STATUS_LABELS,
} from "@/lib/constants/manager-student-display";
import type { StudentStatusValue } from "@/lib/constants/manager-student-status";
import { cn } from "@/lib/utils";

type StudentStatusBadgeProps = {
  status: StudentStatusValue;
  className?: string;
};

export function StudentStatusBadge({ status, className }: StudentStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-0.5 text-xs font-medium capitalize",
        MANAGER_STUDENT_STATUS_BADGE_CLASSES[status],
        className
      )}
    >
      {MANAGER_STUDENT_STATUS_LABELS[status]}
    </span>
  );
}
