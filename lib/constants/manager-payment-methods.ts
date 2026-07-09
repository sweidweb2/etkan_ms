export const PAYMENT_METHODS = {
  CARD: "card",
  CASH: "cash",
  BANK_TRANSFER: "bank_transfer",
} as const;

export type PaymentMethodValue =
  (typeof PAYMENT_METHODS)[keyof typeof PAYMENT_METHODS];

export const PAYMENT_METHOD_VALUES = Object.values(PAYMENT_METHODS);

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodValue, string> = {
  card: "Card",
  cash: "Cash",
  bank_transfer: "Bank transfer",
};
