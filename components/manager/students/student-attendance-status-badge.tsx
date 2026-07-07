import {
  MANAGER_STUDENT_ATTENDANCE_STATUS_BADGE_CLASSES,
  MANAGER_STUDENT_ATTENDANCE_STATUS_LABELS,
} from "@/lib/constants/manager-student-attendance-display";
import type { StudentAttendanceStatusValue } from "@/lib/constants/manager-student-attendance-status";
import { cn } from "@/lib/utils";

type StudentAttendanceStatusBadgeProps = {
  status: StudentAttendanceStatusValue;
  className?: string;
};

export function StudentAttendanceStatusBadge({
  status,
  className,
}: StudentAttendanceStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-0.5 text-xs font-medium capitalize",
        MANAGER_STUDENT_ATTENDANCE_STATUS_BADGE_CLASSES[status],
        className
      )}
    >
      {MANAGER_STUDENT_ATTENDANCE_STATUS_LABELS[status]}
    </span>
  );
}
