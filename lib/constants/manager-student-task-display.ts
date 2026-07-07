import type { StudentTaskStatusValue } from "@/lib/constants/manager-student-task-status";

export const MANAGER_STUDENT_TASK_STATUS_LABELS: Record<
  StudentTaskStatusValue,
  string
> = {
  pending: "Pending",
  submitted: "Submitted",
  graded: "Graded",
  late: "Late",
  missing: "Missing",
};

export const MANAGER_STUDENT_TASK_STATUS_BADGE_CLASSES: Record<
  StudentTaskStatusValue,
  string
> = {
  pending: "bg-muted text-muted-foreground",
  submitted: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  graded: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  late: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  missing: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
};

export const MANAGER_STUDENT_TASK_SLOT_CLASSES: Record<
  StudentTaskStatusValue,
  string
> = {
  pending: "border-muted-foreground/25 bg-muted/40",
  submitted: "border-sky-500/40 bg-sky-500/8",
  graded: "border-emerald-500/40 bg-emerald-500/8",
  late: "border-amber-500/40 bg-amber-500/8",
  missing: "border-rose-500/40 bg-rose-500/8",
};
