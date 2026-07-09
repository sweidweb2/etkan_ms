export const STUDENT_SEMESTER_STATUSES = {
  PENDING: "pending",
  ACTIVE: "active",
  INACTIVE: "inactive",
  WITHDRAWN: "withdrawn",
} as const;

export type StudentSemesterStatusValue =
  (typeof STUDENT_SEMESTER_STATUSES)[keyof typeof STUDENT_SEMESTER_STATUSES];

export const STUDENT_SEMESTER_STATUS_VALUES = Object.values(STUDENT_SEMESTER_STATUSES);
