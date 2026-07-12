export const SUBSCRIBED_SEMESTER_STATUSES = {
  PENDING: "pending",
  PAID: "paid",
  PAUSED: "paused",
  STOPPED: "stopped",
  REFUNDED: "refunded",
} as const;

export type SubscribedSemesterStatusValue =
  (typeof SUBSCRIBED_SEMESTER_STATUSES)[keyof typeof SUBSCRIBED_SEMESTER_STATUSES];

export const SUBSCRIBED_SEMESTER_STATUS_VALUES = Object.values(
  SUBSCRIBED_SEMESTER_STATUSES
);
