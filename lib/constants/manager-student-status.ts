export const STUDENT_STATUSES = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  GRADUATED: "graduated",
  SUSPENDED: "suspended",
} as const;

export type StudentStatusValue =
  (typeof STUDENT_STATUSES)[keyof typeof STUDENT_STATUSES];

export const STUDENT_STATUS_VALUES = Object.values(STUDENT_STATUSES);
