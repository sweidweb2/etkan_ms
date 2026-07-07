import {
  STUDENT_STATUSES,
  type StudentStatusValue,
} from "@/lib/constants/manager-student-status";

export const MANAGER_STUDENT_STATUS_LABELS: Record<StudentStatusValue, string> =
  {
    [STUDENT_STATUSES.ACTIVE]: "Active",
    [STUDENT_STATUSES.INACTIVE]: "Inactive",
    [STUDENT_STATUSES.GRADUATED]: "Graduated",
    [STUDENT_STATUSES.SUSPENDED]: "Suspended",
  };

export const MANAGER_STUDENT_STATUS_BADGE_CLASSES: Record<
  StudentStatusValue,
  string
> = {
  [STUDENT_STATUSES.ACTIVE]: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  [STUDENT_STATUSES.INACTIVE]: "bg-muted text-muted-foreground",
  [STUDENT_STATUSES.GRADUATED]: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  [STUDENT_STATUSES.SUSPENDED]: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
};
