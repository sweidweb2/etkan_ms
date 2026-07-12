import { describe, expect, it } from "vitest";
import {
  resolveManageAccountingAlert,
  isOpenBillingSubscriptionStatus,
  isSubscriptionOpenForPaymentAlerts,
} from "@/lib/constants/manager-accounting-payment-alert";
import { SUBSCRIBED_SEMESTER_STATUSES } from "@/lib/constants/manager-subscribed-semester-status";

describe("isOpenBillingSubscriptionStatus", () => {
  it("treats pending as open", () => {
    expect(
      isOpenBillingSubscriptionStatus(SUBSCRIBED_SEMESTER_STATUSES.PENDING)
    ).toBe(true);
  });

  it("treats paid paused stopped refunded as closed", () => {
    expect(isOpenBillingSubscriptionStatus(SUBSCRIBED_SEMESTER_STATUSES.PAID)).toBe(
      false
    );
    expect(
      isOpenBillingSubscriptionStatus(SUBSCRIBED_SEMESTER_STATUSES.PAUSED)
    ).toBe(false);
    expect(
      isOpenBillingSubscriptionStatus(SUBSCRIBED_SEMESTER_STATUSES.STOPPED)
    ).toBe(false);
    expect(
      isOpenBillingSubscriptionStatus(SUBSCRIBED_SEMESTER_STATUSES.REFUNDED)
    ).toBe(false);
  });
});

describe("resolveManageAccountingAlert", () => {
  const now = new Date("2026-07-15T12:00:00.000Z");

  it("returns complex when more than one open subscription", () => {
    const result = resolveManageAccountingAlert({
      openBillingCount: 2,
      now,
    });

    expect(result.payment_alert_reasons).toEqual(["complex"]);
    expect(result.payment_alert).toBe(true);
  });

  it("returns empty when not the focus open subscription", () => {
    const result = resolveManageAccountingAlert({
      openBillingCount: 1,
      isFocusOpenSubscription: false,
      totalPaid: 0,
      now,
    });

    expect(result.payment_alert_reasons).toEqual([]);
  });

  it("marks done when special-case owed is fully paid", () => {
    const result = resolveManageAccountingAlert({
      openBillingCount: 1,
      isFocusOpenSubscription: true,
      totalPaid: 200,
      semesterAmount: 500,
      activeSpecialCaseTotalAmount: 200,
      now,
    });

    expect(result.payment_alert_reasons).toEqual(["done"]);
    expect(result.payment_alert).toBe(false);
  });

  it("marks done for 100% scholarship (special total 0) with no payments", () => {
    const result = resolveManageAccountingAlert({
      openBillingCount: 1,
      isFocusOpenSubscription: true,
      totalPaid: 0,
      semesterAmount: 500,
      activeSpecialCaseTotalAmount: 0,
      hasScheduledPayments: true,
      hasMissedScheduledPayment: true,
      paidAts: [],
      now,
    });

    expect(result.payment_alert_reasons).toEqual(["done"]);
    expect(result.payment_alert).toBe(false);
  });

  it("marks done for 100% scholarship even when prior payments exist", () => {
    const result = resolveManageAccountingAlert({
      openBillingCount: 1,
      isFocusOpenSubscription: true,
      totalPaid: 50,
      semesterAmount: 500,
      activeSpecialCaseTotalAmount: 0,
      paidAts: ["2026-01-01T00:00:00.000Z"],
      now,
    });

    expect(result.payment_alert_reasons).toEqual(["done"]);
    expect(result.payment_alert).toBe(false);
  });

  it("excludes fully covered subscriptions from open payment alerts", () => {
    expect(
      isSubscriptionOpenForPaymentAlerts({
        status: SUBSCRIBED_SEMESTER_STATUSES.PENDING,
        subscriptionAmount: 500,
        totalPaid: 0,
        activeSpecialCaseTotalAmount: 0,
      })
    ).toBe(false);
    expect(
      isSubscriptionOpenForPaymentAlerts({
        status: SUBSCRIBED_SEMESTER_STATUSES.PENDING,
        subscriptionAmount: 500,
        totalPaid: 0,
        activeSpecialCaseTotalAmount: 200,
      })
    ).toBe(true);
    expect(
      isSubscriptionOpenForPaymentAlerts({
        status: SUBSCRIBED_SEMESTER_STATUSES.PAID,
        subscriptionAmount: 500,
        totalPaid: 0,
        activeSpecialCaseTotalAmount: 0,
      })
    ).toBe(false);
  });

  it("uses schedule missed for incomplete special case with schedules", () => {
    const result = resolveManageAccountingAlert({
      openBillingCount: 1,
      isFocusOpenSubscription: true,
      totalPaid: 50,
      semesterAmount: 500,
      activeSpecialCaseTotalAmount: 200,
      hasScheduledPayments: true,
      hasMissedScheduledPayment: true,
      now,
    });

    expect(result.payment_alert_reasons).toEqual(["missed_schedule"]);
  });

  it("uses scheduled when special case has schedules without misses", () => {
    const result = resolveManageAccountingAlert({
      openBillingCount: 1,
      isFocusOpenSubscription: true,
      totalPaid: 50,
      semesterAmount: 500,
      activeSpecialCaseTotalAmount: 200,
      hasScheduledPayments: true,
      hasMissedScheduledPayment: false,
      now,
    });

    expect(result.payment_alert_reasons).toEqual(["scheduled"]);
  });

  it("uses L levels for incomplete special case without schedules", () => {
    const result = resolveManageAccountingAlert({
      openBillingCount: 1,
      isFocusOpenSubscription: true,
      totalPaid: 0,
      semesterAmount: 500,
      activeSpecialCaseTotalAmount: 200,
      hasScheduledPayments: false,
      paidAts: [],
      now,
    });

    expect(result.payment_alert_reasons).toEqual(["no_payment_6_months"]);
  });

  it("adds under-$100 and schedule for standard accounts", () => {
    const result = resolveManageAccountingAlert({
      openBillingCount: 1,
      isFocusOpenSubscription: true,
      totalPaid: 40,
      hasScheduledPayments: true,
      hasMissedScheduledPayment: false,
      now,
    });

    expect(result.payment_alert_reasons).toEqual(["low_payment", "scheduled"]);
    expect(result.low_payment).toBe(true);
  });

  it("adds under-$100 and L level when no schedule", () => {
    const result = resolveManageAccountingAlert({
      openBillingCount: 1,
      isFocusOpenSubscription: true,
      totalPaid: 40,
      hasScheduledPayments: false,
      paidAts: [],
      now,
    });

    expect(result.payment_alert_reasons).toEqual([
      "low_payment",
      "no_payment_6_months",
    ]);
  });
});
