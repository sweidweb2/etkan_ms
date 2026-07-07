import {
  MANAGER_STUDENT_CLASS_STATUS_BADGE_CLASSES,
  MANAGER_STUDENT_CLASS_STATUS_LABELS,
} from "@/lib/constants/manager-student-class-display";
import type { StudentClassStatusValue } from "@/lib/constants/manager-student-class-status";
import { cn } from "@/lib/utils";

type StudentClassStatusBadgeProps = {
  status: StudentClassStatusValue;
  className?: string;
};

export function StudentClassStatusBadge({
  status,
  className,
}: StudentClassStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-0.5 text-xs font-medium capitalize",
        MANAGER_STUDENT_CLASS_STATUS_BADGE_CLASSES[status],
        className
      )}
    >
      {MANAGER_STUDENT_CLASS_STATUS_LABELS[status]}
    </span>
  );
}
