import {
  FINANCIAL_ADJUSTMENT_VALUE_TYPES,
  type FinancialAdjustmentValueType,
} from "@/lib/manager/accounting/constants";

export type SppAdjustmentInput = {
  value_type: FinancialAdjustmentValueType;
  value: number;
};

export type SppFinancials = {
  original: number;
  adjustmentAmount: number;
  finalDue: number;
  totalPaid: number;
  remaining: number;
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Compute SPP money summary from live phase amount, optional adjustment, and payments.
 * `finalDue` is clamped to >= 0; `remaining` may be negative (credit / overpay).
 */
export function computeSppFinancials(
  phaseAmount: number,
  adjustment: SppAdjustmentInput | null,
  paymentAmounts: number[]
): SppFinancials {
  const original = roundMoney(Math.max(0, Number(phaseAmount) || 0));

  let adjustmentAmount = 0;
  if (adjustment) {
    const value = Math.max(0, Number(adjustment.value) || 0);
    if (adjustment.value_type === FINANCIAL_ADJUSTMENT_VALUE_TYPES.PERCENTAGE) {
      adjustmentAmount = roundMoney(original * (Math.min(value, 100) / 100));
    } else {
      adjustmentAmount = roundMoney(value);
    }
  }

  const finalDue = roundMoney(Math.max(0, original - adjustmentAmount));
  const totalPaid = roundMoney(
    paymentAmounts.reduce((sum, amount) => sum + Math.max(0, Number(amount) || 0), 0)
  );
  const remaining = roundMoney(finalDue - totalPaid);

  return {
    original,
    adjustmentAmount,
    finalDue,
    totalPaid,
    remaining,
  };
}
