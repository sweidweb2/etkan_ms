import type { StudentSemesterStatusValue } from "@/lib/constants/manager-student-semester-status";

export const MANAGER_STUDENT_SEMESTER_STATUS_LABELS: Record<
  StudentSemesterStatusValue,
  string
> = {
  pending: "Pending",
  active: "Active",
  inactive: "Inactive",
  withdrawn: "Withdrawn",
};

export const MANAGER_STUDENT_SEMESTER_STATUS_BADGE_CLASSES: Record<
  StudentSemesterStatusValue,
  string
> = {
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  inactive: "bg-muted text-muted-foreground",
  withdrawn: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
};

export const MANAGER_STUDENT_SEMESTER_TABLE_LIMITS = {
  fullName: 28,
  email: 36,
} as const;
