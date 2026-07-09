import {
  MANAGER_STUDENT_SEMESTER_STATUS_BADGE_CLASSES,
  MANAGER_STUDENT_SEMESTER_STATUS_LABELS,
} from "@/lib/constants/manager-student-semester-display";
import type { StudentSemesterStatusValue } from "@/lib/constants/manager-student-semester-status";
import { cn } from "@/lib/utils";

type StudentSemesterStatusBadgeProps = {
  status: StudentSemesterStatusValue;
  className?: string;
};

export function StudentSemesterStatusBadge({
  status,
  className,
}: StudentSemesterStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
        MANAGER_STUDENT_SEMESTER_STATUS_BADGE_CLASSES[status],
        className
      )}
    >
      {MANAGER_STUDENT_SEMESTER_STATUS_LABELS[status]}
    </span>
  );
}
