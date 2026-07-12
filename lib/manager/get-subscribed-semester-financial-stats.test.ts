import { describe, expect, it } from "vitest";
import { SUBSCRIBED_SEMESTER_STATUSES } from "@/lib/constants/manager-subscribed-semester-status";
import { getSubscribedSemesterFinancialStats } from "@/lib/manager/get-subscribed-semester-financial-stats";
import type { ManagerSubscribedSemesterRow } from "@/types/manager-student-account";

const subscription: ManagerSubscribedSemesterRow = {
  id: "e5e6e7e8-e9e0-4123-8fab-567890123456",
  account_id: "d4d5d6d7-d8d9-4012-8efa-456789012345",
  semester_id: "a7a8a9a0-a1a2-4456-8bcd-789012345678",
  semester_name: "Fall",
  amount: 500,
  status: SUBSCRIBED_SEMESTER_STATUSES.PENDING,
  created_at: "2026-01-01T00:00:00.000Z",
  paid_amount: 200,
};

describe("getSubscribedSemesterFinancialStats", () => {
  it("uses subscription amount when no special case", () => {
    const stats = getSubscribedSemesterFinancialStats(subscription, [], []);

    expect(stats.totalSubscribed).toBe(500);
    expect(stats.totalPaid).toBe(200);
    expect(stats.totalDue).toBe(300);
    expect(stats.paidProgressPercent).toBe(40);
  });

  it("uses active special-case owed for totals and progress", () => {
    const stats = getSubscribedSemesterFinancialStats(
      subscription,
      [],
      [],
      200
    );

    expect(stats.totalSubscribed).toBe(200);
    expect(stats.totalPaid).toBe(200);
    expect(stats.totalDue).toBe(0);
    expect(stats.paidProgressPercent).toBe(100);
  });

  it("treats zero owed as fully paid progress", () => {
    const stats = getSubscribedSemesterFinancialStats(
      { ...subscription, paid_amount: 0 },
      [],
      [],
      0
    );

    expect(stats.totalSubscribed).toBe(0);
    expect(stats.totalDue).toBe(0);
    expect(stats.paidProgressPercent).toBe(100);
  });
});
