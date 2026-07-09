export const SCHEDULED_PAYMENT_STATUSES = {
  SCHEDULED: "scheduled",
  REMINDED: "reminded",
  COMPLETED: "completed",
  MISSED: "missed",
  CANCELLED: "cancelled",
} as const;

export type ScheduledPaymentStatusValue =
  (typeof SCHEDULED_PAYMENT_STATUSES)[keyof typeof SCHEDULED_PAYMENT_STATUSES];

export const SCHEDULED_PAYMENT_STATUS_VALUES = Object.values(
  SCHEDULED_PAYMENT_STATUSES
);
