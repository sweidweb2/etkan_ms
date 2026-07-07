export const STUDENT_CLASS_STATUSES = {
  IN_PROGRESS: "in_progress",
  DONE: "done",
  PAUSED: "paused",
  STOPPED: "stopped",
} as const;

export type StudentClassStatusValue =
  (typeof STUDENT_CLASS_STATUSES)[keyof typeof STUDENT_CLASS_STATUSES];

export const STUDENT_CLASS_STATUS_VALUES = Object.values(STUDENT_CLASS_STATUSES);
