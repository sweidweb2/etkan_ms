import { describe, expect, it } from "vitest";
import { ACCOUNT_SPECIAL_CASE_STATUSES } from "@/lib/constants/manager-account-special-case";
import { SUBSCRIBED_SEMESTER_STATUSES } from "@/lib/constants/manager-subscribed-semester-status";
import {
  getBillingMutationLockMessage,
  getSubscriptionBillingGate,
  resolveActiveSpecialCaseOwedAmount,
} from "@/lib/manager/subscribed-semester-billing";

describe("getSubscriptionBillingGate", () => {
  it("uses subscription amount when no special case", () => {
    const gate = getSubscriptionBillingGate({
      status: SUBSCRIBED_SEMESTER_STATUSES.PENDING,
      subscriptionAmount: 500,
      totalPaid: 100,
    });

    expect(gate).toMatchObject({
      owedAmount: 500,
      totalPaid: 100,
      remainingDue: 400,
      isPending: true,
      isFullyPaid: false,
      canCreatePayments: true,
      canEditPayments: true,
      canDeletePayments: true,
      canMutateSchedules: true,
      createLockReason: null,
      editLockReason: null,
    });
  });

  it("uses active special-case total as owed amount", () => {
    const gate = getSubscriptionBillingGate({
      status: SUBSCRIBED_SEMESTER_STATUSES.PENDING,
      subscriptionAmount: 500,
      totalPaid: 50,
      activeSpecialCaseTotalAmount: 200,
    });

    expect(gate.owedAmount).toBe(200);
    expect(gate.remainingDue).toBe(150);
    expect(gate.canCreatePayments).toBe(true);
    expect(gate.canEditPayments).toBe(true);
  });

  it("treats 0 special-case amount as fully paid (100% scholarship)", () => {
    const gate = getSubscriptionBillingGate({
      status: SUBSCRIBED_SEMESTER_STATUSES.PENDING,
      subscriptionAmount: 500,
      totalPaid: 0,
      activeSpecialCaseTotalAmount: 0,
    });

    expect(gate.owedAmount).toBe(0);
    expect(gate.remainingDue).toBe(0);
    expect(gate.isFullyPaid).toBe(true);
    expect(gate.canCreatePayments).toBe(false);
    expect(gate.canMutateSchedules).toBe(false);
    expect(gate.createLockReason).toBe("fully_paid");
  });

  it("locks create and edit when status is paused", () => {
    const gate = getSubscriptionBillingGate({
      status: SUBSCRIBED_SEMESTER_STATUSES.PAUSED,
      subscriptionAmount: 500,
      totalPaid: 0,
    });

    expect(gate.canCreatePayments).toBe(false);
    expect(gate.canEditPayments).toBe(false);
    expect(gate.canDeletePayments).toBe(false);
    expect(gate.createLockReason).toBe("not_pending");
    expect(gate.editLockReason).toBe("status_locked");
  });

  it("allows edit/delete when paid but blocks create", () => {
    const gate = getSubscriptionBillingGate({
      status: SUBSCRIBED_SEMESTER_STATUSES.PAID,
      subscriptionAmount: 500,
      totalPaid: 500,
    });

    expect(gate.isFullyPaid).toBe(true);
    expect(gate.remainingDue).toBe(0);
    expect(gate.canCreatePayments).toBe(false);
    expect(gate.canEditPayments).toBe(true);
    expect(gate.canDeletePayments).toBe(true);
    expect(gate.canMutateSchedules).toBe(false);
    expect(gate.createLockReason).toBe("fully_paid");
    expect(gate.editLockReason).toBeNull();
  });

  it("blocks create when pending and fully paid", () => {
    const gate = getSubscriptionBillingGate({
      status: SUBSCRIBED_SEMESTER_STATUSES.PENDING,
      subscriptionAmount: 500,
      totalPaid: 500,
    });

    expect(gate.canCreatePayments).toBe(false);
    expect(gate.canEditPayments).toBe(true);
    expect(gate.createLockReason).toBe("fully_paid");
  });
});

describe("getBillingMutationLockMessage", () => {
  it("returns pending, fully-paid, and status-locked messages", () => {
    expect(getBillingMutationLockMessage("not_pending", "payments")).toBe(
      "Payments are locked unless the subscription is pending."
    );
    expect(getBillingMutationLockMessage("not_pending", "schedules")).toBe(
      "Schedules are locked unless the subscription is pending."
    );
    expect(getBillingMutationLockMessage("fully_paid", "create_payment")).toBe(
      "This semester is fully paid. New payments cannot be added."
    );
    expect(getBillingMutationLockMessage("status_locked", "edit_payment")).toBe(
      "Payments can only be edited when the subscription is pending or paid."
    );
    expect(getBillingMutationLockMessage("status_locked", "delete_payment")).toBe(
      "Payments can only be deleted when the subscription is pending or paid."
    );
  });
});

describe("resolveActiveSpecialCaseOwedAmount", () => {
  it("returns total only for active special cases", () => {
    expect(
      resolveActiveSpecialCaseOwedAmount({
        status: ACCOUNT_SPECIAL_CASE_STATUSES.ACTIVE,
        total_amount: 250,
      })
    ).toBe(250);
    expect(
      resolveActiveSpecialCaseOwedAmount({
        status: ACCOUNT_SPECIAL_CASE_STATUSES.INACTIVE,
        total_amount: 250,
      })
    ).toBeNull();
    expect(resolveActiveSpecialCaseOwedAmount(null)).toBeNull();
  });
});
