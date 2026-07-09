import { PAYMENT_METHOD_LABELS } from "@/lib/constants/manager-payment-methods";
import type { PaymentMethodValue } from "@/lib/constants/manager-payment-methods";

export const MANAGER_PAYMENT_TABLE_LIMITS = {
  method: 20,
  currency: 8,
} as const;

export function formatPaymentMethodLabel(method: string | null) {
  if (!method) {
    return "—";
  }

  return PAYMENT_METHOD_LABELS[method as PaymentMethodValue] ?? method;
}
