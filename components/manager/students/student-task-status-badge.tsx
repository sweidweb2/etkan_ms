import {
  MANAGER_STUDENT_TASK_STATUS_BADGE_CLASSES,
  MANAGER_STUDENT_TASK_STATUS_LABELS,
} from "@/lib/constants/manager-student-task-display";
import type { StudentTaskStatusValue } from "@/lib/constants/manager-student-task-status";
import { cn } from "@/lib/utils";

type StudentTaskStatusBadgeProps = {
  status: StudentTaskStatusValue;
  className?: string;
};

export function StudentTaskStatusBadge({
  status,
  className,
}: StudentTaskStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-0.5 text-xs font-medium capitalize",
        MANAGER_STUDENT_TASK_STATUS_BADGE_CLASSES[status],
        className
      )}
    >
      {MANAGER_STUDENT_TASK_STATUS_LABELS[status]}
    </span>
  );
}
