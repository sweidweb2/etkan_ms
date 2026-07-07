export const STUDENT_TASK_STATUSES = {
  PENDING: "pending",
  SUBMITTED: "submitted",
  GRADED: "graded",
  LATE: "late",
  MISSING: "missing",
} as const;

export type StudentTaskStatusValue =
  (typeof STUDENT_TASK_STATUSES)[keyof typeof STUDENT_TASK_STATUSES];
