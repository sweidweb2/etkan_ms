import { describe, expect, it } from "vitest";
import { FINANCIAL_ADJUSTMENT_VALUE_TYPES } from "@/lib/manager/accounting/constants";
import { financialAdjustmentAmountInDollars } from "@/lib/manager/accounting/adjustment-amount";

describe("financialAdjustmentAmountInDollars", () => {
  it("keeps a fixed value as dollars", () => {
    expect(
      financialAdjustmentAmountInDollars(
        50,
        FINANCIAL_ADJUSTMENT_VALUE_TYPES.FIXED,
        300,
        3
      )
    ).toBe(50);
  });

  it("converts a percentage using monthly phase amount", () => {
    expect(
      financialAdjustmentAmountInDollars(
        10,
        FINANCIAL_ADJUSTMENT_VALUE_TYPES.PERCENTAGE,
        300,
        3
      )
    ).toBe(10);
  });
});
