import { FINANCIAL_ADJUSTMENT_VALUE_TYPES } from "@/lib/manager/accounting/constants";

/** Dollar amount of an SPP adjustment, matching income-statement totals. */
export function financialAdjustmentAmountInDollars(
  value: number,
  valueType: string,
  phaseAmount: number,
  durationMonths: number
): number {
  const monthlyPhaseAmount = phaseAmount / Math.max(durationMonths, 1);
  if (valueType === FINANCIAL_ADJUSTMENT_VALUE_TYPES.PERCENTAGE) {
    return (value / 100) * monthlyPhaseAmount;
  }
  return value;
}
