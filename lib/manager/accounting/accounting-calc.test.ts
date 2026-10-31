import { describe, expect, it } from "vitest";
import {
  FINANCIAL_ADJUSTMENT_VALUE_TYPES,
  PAYMENT_PHASE_STATUSES,
  STUDENT_PAYMENT_PHASE_STATUSES,
} from "@/lib/manager/accounting/constants";
import { derivePaymentPhaseStatus } from "@/lib/manager/accounting/payment-phase-status";
import { computeSppFinancials } from "@/lib/manager/accounting/spp-financials";
import { deriveSppStatus } from "@/lib/manager/accounting/spp-status";

describe("computeSppFinancials", () => {
  it("computes with no adjustment and no payments", () => {
    expect(computeSppFinancials(500, null, [])).toEqual({
      original: 500,
      adjustmentAmount: 0,
      finalDue: 500,
      totalPaid: 0,
      remaining: 500,
    });
  });

  it("nets debit refunds against credits", () => {
    expect(
      computeSppFinancials(100, null, [
        70,
        { amount: 20, type: "debit" as const },
      ])
    ).toMatchObject({
      totalPaid: 50,
      remaining: 50,
    });
  });

  it("applies a fixed adjustment", () => {
    expect(
      computeSppFinancials(
        500,
        { value_type: FINANCIAL_ADJUSTMENT_VALUE_TYPES.FIXED, value: 50 },
        [100]
      )
    ).toEqual({
      original: 500,
      adjustmentAmount: 50,
      finalDue: 450,
      totalPaid: 100,
      remaining: 350,
    });
  });

  it("applies a percentage adjustment", () => {
    expect(
      computeSppFinancials(
        400,
        { value_type: FINANCIAL_ADJUSTMENT_VALUE_TYPES.PERCENTAGE, value: 25 },
        []
      )
    ).toEqual({
      original: 400,
      adjustmentAmount: 100,
      finalDue: 300,
      totalPaid: 0,
      remaining: 300,
    });
  });

  it("clamps finalDue at zero when adjustment exceeds amount", () => {
    expect(
      computeSppFinancials(
        200,
        { value_type: FINANCIAL_ADJUSTMENT_VALUE_TYPES.FIXED, value: 500 },
        []
      )
    ).toEqual({
      original: 200,
      adjustmentAmount: 500,
      finalDue: 0,
      totalPaid: 0,
      remaining: 0,
    });
  });

  it("allows overpay credit (negative remaining)", () => {
    expect(computeSppFinancials(100, null, [150])).toEqual({
      original: 100,
      adjustmentAmount: 0,
      finalDue: 100,
      totalPaid: 150,
      remaining: -50,
    });
  });

  it("treats 100% scholarship as paid-ready due of zero", () => {
    expect(
      computeSppFinancials(
        300,
        { value_type: FINANCIAL_ADJUSTMENT_VALUE_TYPES.PERCENTAGE, value: 100 },
        []
      )
    ).toEqual({
      original: 300,
      adjustmentAmount: 300,
      finalDue: 0,
      totalPaid: 0,
      remaining: 0,
    });
  });
});

describe("deriveSppStatus", () => {
  it("keeps cancelled sticky", () => {
    expect(
      deriveSppStatus(
        {
          original: 100,
          adjustmentAmount: 0,
          finalDue: 100,
          totalPaid: 100,
          remaining: 0,
        },
        STUDENT_PAYMENT_PHASE_STATUSES.CANCELLED
      )
    ).toBe(STUDENT_PAYMENT_PHASE_STATUSES.CANCELLED);
  });

  it("returns pending when nothing paid and due remains", () => {
    expect(
      deriveSppStatus(
        {
          original: 100,
          adjustmentAmount: 0,
          finalDue: 100,
          totalPaid: 0,
          remaining: 100,
        },
        STUDENT_PAYMENT_PHASE_STATUSES.PENDING
      )
    ).toBe(STUDENT_PAYMENT_PHASE_STATUSES.PENDING);
  });

  it("returns partially_paid when remaining is positive", () => {
    expect(
      deriveSppStatus(
        {
          original: 100,
          adjustmentAmount: 0,
          finalDue: 100,
          totalPaid: 40,
          remaining: 60,
        },
        STUDENT_PAYMENT_PHASE_STATUSES.PENDING
      )
    ).toBe(STUDENT_PAYMENT_PHASE_STATUSES.PARTIALLY_PAID);
  });

  it("returns paid when remaining is zero or credit", () => {
    expect(
      deriveSppStatus(
        {
          original: 100,
          adjustmentAmount: 0,
          finalDue: 100,
          totalPaid: 100,
          remaining: 0,
        },
        STUDENT_PAYMENT_PHASE_STATUSES.PARTIALLY_PAID
      )
    ).toBe(STUDENT_PAYMENT_PHASE_STATUSES.PAID);

    expect(
      deriveSppStatus(
        {
          original: 100,
          adjustmentAmount: 0,
          finalDue: 100,
          totalPaid: 120,
          remaining: -20,
        },
        STUDENT_PAYMENT_PHASE_STATUSES.PAID
      )
    ).toBe(STUDENT_PAYMENT_PHASE_STATUSES.PAID);
  });

  it("returns paid when final due is zero with no payments", () => {
    expect(
      deriveSppStatus(
        {
          original: 100,
          adjustmentAmount: 100,
          finalDue: 0,
          totalPaid: 0,
          remaining: 0,
        },
        STUDENT_PAYMENT_PHASE_STATUSES.PENDING
      )
    ).toBe(STUDENT_PAYMENT_PHASE_STATUSES.PAID);
  });
});

describe("derivePaymentPhaseStatus", () => {
  it("keeps cancelled sticky", () => {
    expect(
      derivePaymentPhaseStatus(PAYMENT_PHASE_STATUSES.CANCELLED, [
        STUDENT_PAYMENT_PHASE_STATUSES.PAID,
      ])
    ).toBe(PAYMENT_PHASE_STATUSES.CANCELLED);
  });

  it("stays opened when there are no active SPPs", () => {
    expect(
      derivePaymentPhaseStatus(PAYMENT_PHASE_STATUSES.CLOSED, [
        STUDENT_PAYMENT_PHASE_STATUSES.CANCELLED,
      ])
    ).toBe(PAYMENT_PHASE_STATUSES.OPENED);

    expect(
      derivePaymentPhaseStatus(PAYMENT_PHASE_STATUSES.OPENED, [])
    ).toBe(PAYMENT_PHASE_STATUSES.OPENED);
  });

  it("closes when every active SPP is paid", () => {
    expect(
      derivePaymentPhaseStatus(PAYMENT_PHASE_STATUSES.OPENED, [
        STUDENT_PAYMENT_PHASE_STATUSES.PAID,
        STUDENT_PAYMENT_PHASE_STATUSES.CANCELLED,
        STUDENT_PAYMENT_PHASE_STATUSES.PAID,
      ])
    ).toBe(PAYMENT_PHASE_STATUSES.CLOSED);
  });

  it("reopens when any active SPP is unpaid", () => {
    expect(
      derivePaymentPhaseStatus(PAYMENT_PHASE_STATUSES.CLOSED, [
        STUDENT_PAYMENT_PHASE_STATUSES.PAID,
        STUDENT_PAYMENT_PHASE_STATUSES.PENDING,
      ])
    ).toBe(PAYMENT_PHASE_STATUSES.OPENED);

    expect(
      derivePaymentPhaseStatus(PAYMENT_PHASE_STATUSES.CLOSED, [
        STUDENT_PAYMENT_PHASE_STATUSES.PARTIALLY_PAID,
      ])
    ).toBe(PAYMENT_PHASE_STATUSES.OPENED);
  });
});
