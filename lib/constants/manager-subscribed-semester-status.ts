export const SUBSCRIBED_SEMESTER_STATUSES = {
  ACTIVE: "active",
  PENDING: "pending",
  CANCELLED: "cancelled",
  OVERDUE: "overdue",
} as const;

export type SubscribedSemesterStatusValue =
  (typeof SUBSCRIBED_SEMESTER_STATUSES)[keyof typeof SUBSCRIBED_SEMESTER_STATUSES];

export const SUBSCRIBED_SEMESTER_STATUS_VALUES = Object.values(
  SUBSCRIBED_SEMESTER_STATUSES
);
