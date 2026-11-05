import {
  FINANCIAL_ADJUSTMENT_VALUE_TYPES,
  STUDENT_PAYMENT_TYPES,
  type FinancialAdjustmentValueType,
  type StudentPaymentType,
} from "@/lib/manager/accounting/constants";

export type SppAdjustmentInput = {
  value_type: FinancialAdjustmentValueType;
  value: number;
};

export type SppPaymentLine = {
  amount: number;
  type?: StudentPaymentType;
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

function normalizePaymentLines(
  payments: Array<number | SppPaymentLine>
): SppPaymentLine[] {
  return payments.map((entry) =>
    typeof entry === "number"
      ? { amount: entry, type: STUDENT_PAYMENT_TYPES.CREDIT }
      : {
          amount: entry.amount,
          type: entry.type ?? STUDENT_PAYMENT_TYPES.CREDIT,
        }
  );
}

/** Net paid: credits − debits. */
export function sumNetPaymentAmount(
  payments: Array<number | SppPaymentLine>
): number {
  return roundMoney(
    normalizePaymentLines(payments).reduce((sum, line) => {
      const amount = Math.max(0, Number(line.amount) || 0);
      if (line.type === STUDENT_PAYMENT_TYPES.DEBIT) {
        return sum - amount;
      }
      return sum + amount;
    }, 0)
  );
}

/**
 * Compute SPP money summary from live phase amount, optional adjustment, and payments.
 * `finalDue` is clamped to >= 0; `remaining` may be negative (credit / overpay).
 * Payment entries may be bare numbers (treated as credits) or `{ amount, type }`.
 */
export function computeSppFinancials(
  phaseAmount: number,
  adjustment: SppAdjustmentInput | null,
  paymentAmounts: Array<number | SppPaymentLine>
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
  const totalPaid = sumNetPaymentAmount(paymentAmounts);
  const remaining = roundMoney(finalDue - totalPaid);

  return {
    original,
    adjustmentAmount,
    finalDue,
    totalPaid,
    remaining,
  };
}
