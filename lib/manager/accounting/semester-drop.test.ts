import { describe, expect, it } from "vitest";
import {
  computeDropDeadlineAt,
  computeDropRefundOwed,
  computeDropRequiredAmount,
  computeDropSettlementAdjustment,
} from "@/lib/manager/accounting/semester-drop";
import { computeSppFinancials } from "@/lib/manager/accounting/spp-financials";
import { STUDENT_PAYMENT_TYPES } from "@/lib/manager/accounting/constants";

describe("semester drop money helpers", () => {
  it("computes required amount from adjusted final due and percent", () => {
    expect(computeDropRequiredAmount(100, 50)).toBe(50);
    expect(computeDropRequiredAmount(100, 60)).toBe(60);
  });

  it("uses adjusted final due so phase 100 with 20% off at 50% drop requires 40", () => {
    const financials = computeSppFinancials(100, {
      value_type: "percentage",
      value: 20,
    }, []);
    expect(financials.finalDue).toBe(80);
    expect(computeDropRequiredAmount(financials.finalDue, 50)).toBe(40);
    expect(computeDropSettlementAdjustment(100, 40)).toBe(60);
  });

  it("adds two months to phase start for deadline", () => {
    expect(computeDropDeadlineAt("2026-01-15")).toBe("2026-03-15");
  });

  it("computes refund owed above required", () => {
    expect(computeDropRefundOwed(70, 50)).toBe(20);
    expect(computeDropRefundOwed(40, 50)).toBe(0);
  });

  it("computes settlement adjustment so due equals required", () => {
    expect(computeDropSettlementAdjustment(100, 50)).toBe(50);
  });
});

describe("computeSppFinancials with debit payments", () => {
  it("nets credits minus debits", () => {
    expect(
      computeSppFinancials(100, null, [
        { amount: 70, type: STUDENT_PAYMENT_TYPES.CREDIT },
        { amount: 20, type: STUDENT_PAYMENT_TYPES.DEBIT },
      ])
    ).toEqual({
      original: 100,
      adjustmentAmount: 0,
      finalDue: 100,
      totalPaid: 50,
      remaining: 50,
    });
  });

  it("still treats bare numbers as credits", () => {
    expect(computeSppFinancials(100, null, [70])).toMatchObject({
      totalPaid: 70,
      remaining: 30,
    });
  });
});
