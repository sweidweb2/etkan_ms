export const PAYMENT_PHASE_STATUSES = {
  OPENED: "opened",
  CLOSED: "closed",
  CANCELLED: "cancelled",
} as const;

export type PaymentPhaseStatus =
  (typeof PAYMENT_PHASE_STATUSES)[keyof typeof PAYMENT_PHASE_STATUSES];

export const PAYMENT_PHASE_STATUS_VALUES = [
  PAYMENT_PHASE_STATUSES.OPENED,
  PAYMENT_PHASE_STATUSES.CLOSED,
  PAYMENT_PHASE_STATUSES.CANCELLED,
] as const;

export const STUDENT_PAYMENT_PHASE_STATUSES = {
  PENDING: "pending",
  PARTIALLY_PAID: "partially_paid",
  PAID: "paid",
  CANCELLED: "cancelled",
} as const;

export type StudentPaymentPhaseStatus =
  (typeof STUDENT_PAYMENT_PHASE_STATUSES)[keyof typeof STUDENT_PAYMENT_PHASE_STATUSES];

export const STUDENT_PAYMENT_PHASE_STATUS_VALUES = [
  STUDENT_PAYMENT_PHASE_STATUSES.PENDING,
  STUDENT_PAYMENT_PHASE_STATUSES.PARTIALLY_PAID,
  STUDENT_PAYMENT_PHASE_STATUSES.PAID,
  STUDENT_PAYMENT_PHASE_STATUSES.CANCELLED,
] as const;

export const FINANCIAL_ADJUSTMENT_VALUE_TYPES = {
  FIXED: "fixed",
  PERCENTAGE: "percentage",
} as const;

export type FinancialAdjustmentValueType =
  (typeof FINANCIAL_ADJUSTMENT_VALUE_TYPES)[keyof typeof FINANCIAL_ADJUSTMENT_VALUE_TYPES];

export const PAYMENT_METHODS = {
  CASH: "cash",
  OMT: "omt",
  WHISH: "whish",
  BANK_TRANSFER: "bank_transfer",
  CARD: "card",
  OTHER: "other",
} as const;

export type PaymentMethod =
  (typeof PAYMENT_METHODS)[keyof typeof PAYMENT_METHODS];

export const PAYMENT_METHOD_VALUES = [
  PAYMENT_METHODS.CASH,
  PAYMENT_METHODS.OMT,
  PAYMENT_METHODS.WHISH,
  PAYMENT_METHODS.BANK_TRANSFER,
  PAYMENT_METHODS.CARD,
  PAYMENT_METHODS.OTHER,
] as const;

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  [PAYMENT_METHODS.CASH]: "Cash",
  [PAYMENT_METHODS.OMT]: "OMT",
  [PAYMENT_METHODS.WHISH]: "Whish",
  [PAYMENT_METHODS.BANK_TRANSFER]: "Bank transfer",
  [PAYMENT_METHODS.CARD]: "Card",
  [PAYMENT_METHODS.OTHER]: "Other",
};
