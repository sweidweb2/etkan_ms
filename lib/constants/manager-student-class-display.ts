import type { StudentClassStatusValue } from "@/lib/constants/manager-student-class-status";

export const MANAGER_STUDENT_CLASS_STATUS_LABELS: Record<
  StudentClassStatusValue,
  string
> = {
  enrolled: "Enrolled",
  paused: "Paused",
  stopped: "Stopped",
};

export const MANAGER_STUDENT_CLASS_STATUS_BADGE_CLASSES: Record<
  StudentClassStatusValue,
  string
> = {
  enrolled: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  paused: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  stopped: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
};

/** Status dot colors for class tab chips. */
export const MANAGER_STUDENT_CLASS_TAB_STATUS_DOT: Record<
  StudentClassStatusValue,
  string
> = {
  enrolled: "bg-sky-500",
  paused: "bg-amber-500",
  stopped: "bg-rose-500",
};

/** Active-state ring accent per class enrollment status. */
export const MANAGER_STUDENT_CLASS_TAB_ACTIVE_RING: Record<
  StudentClassStatusValue,
  string
> = {
  enrolled: "data-[state=active]:ring-sky-500/30",
  paused: "data-[state=active]:ring-amber-500/30",
  stopped: "data-[state=active]:ring-rose-500/30",
};
