import { describe, expect, it, vi, beforeEach } from "vitest";
import { ACCOUNT_SPECIAL_CASE_STATUSES, ACCOUNT_SPECIAL_CASE_TYPES } from "@/lib/constants/manager-account-special-case";
import { SCHEDULED_PAYMENT_STATUSES } from "@/lib/constants/manager-scheduled-payment-status";
import { ROLES } from "@/lib/constants/roles";
import { SUBSCRIBED_SEMESTER_STATUSES } from "@/lib/constants/manager-subscribed-semester-status";
import * as accountRepository from "@/repositories/account.repository";
import * as accountSpecialCaseRepository from "@/repositories/account-special-case.repository";
import * as paymentRepository from "@/repositories/payment.repository";
import * as scheduledPaymentRepository from "@/repositories/scheduled-payment.repository";
import * as semesterRepository from "@/repositories/semester.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import * as studentSemesterRepository from "@/repositories/student-semester.repository";
import * as subscribedSemesterRepository from "@/repositories/subscribed-semester.repository";
import * as auditLogService from "@/services/audit-log.service";
import type { AuditActor } from "@/services/audit-log.service";
import * as studentService from "@/services/student.service";
import * as subscribedSemesterService from "@/services/subscribed-semester.service";
import {
  createAccountSpecialCaseForManager,
  createPaymentForManager,
  createScheduledPaymentForManager,
  deletePaymentForManager,
  getStudentAccountForManager,
  updatePaymentForManager,
  updateScheduledPaymentForManager,
  updateSubscribedSemesterForManager,
} from "@/services/accounting.service";

vi.mock("@/repositories/account.repository");
vi.mock("@/repositories/account-special-case.repository");
vi.mock("@/repositories/payment.repository");
vi.mock("@/repositories/scheduled-payment.repository");
vi.mock("@/repositories/semester.repository");
vi.mock("@/repositories/student-profile.repository");
vi.mock("@/repositories/student-semester.repository");
vi.mock("@/repositories/subscribed-semester.repository");
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(),
}));
vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));
vi.mock("@/services/audit-log.service", () => ({
  recordManagerAuditLog: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/services/student.service", () => ({
  listStudentsForManager: vi.fn(),
}));
vi.mock("@/services/subscribed-semester.service", () => ({
  ensureSubscribedSemesterForAccount: vi.fn().mockResolvedValue(null),
  markSubscribedSemesterPaidForAccount: vi.fn().mockResolvedValue(undefined),
}));

const adminClient = {} as never;
const actor: AuditActor = {
  userId: "11111111-1111-4111-8111-111111111111",
  userLabel: "Manager",
};
const studentProfileId = "b2b3b4b5-b6b7-4890-bcde-f23456789012";
const userId = "c3c4c5c6-c7c8-4901-8def-345678901234";
const accountId = "d4d5d6d7-d8d9-4012-8efa-456789012345";
const subscriptionId = "e5e6e7e8-e9e0-4123-8fab-567890123456";
const paymentId = "f6f7f8f9-f0f1-4234-9abc-678901234567";
const semesterId = "a7a8a9a0-a1a2-4456-8bcd-789012345678";
const scheduledPaymentId = "b8b9bab1-b2b3-4567-8cde-890123456789";

function pendingSubscription(overrides?: Record<string, unknown>) {
  return {
    id: subscriptionId,
    account_id: accountId,
    semester_id: semesterId,
    amount: 500,
    status: SUBSCRIBED_SEMESTER_STATUSES.PENDING,
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function mockBillingLookups(options?: {
  payments?: Array<{ id: string; amount: number }>;
  specialCase?: { status: string; total_amount: number } | null;
}) {
  vi.mocked(paymentRepository.listPaymentsBySubscribedSemesterIds).mockResolvedValue({
    data: (options?.payments ?? []).map((payment) => ({
      id: payment.id,
      subscribed_semester_id: subscriptionId,
      amount: payment.amount,
      currency: "USD",
      method: "bank_transfer",
      paid_at: "2026-07-01T00:00:00.000Z",
    })),
    error: null,
  } as never);
  vi.mocked(
    accountSpecialCaseRepository.findSpecialCaseByAccountAndSemester
  ).mockResolvedValue({
    data: options?.specialCase ?? null,
    error: null,
  } as never);
}

describe("createPaymentForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("returns unauthorized for non-manager", async () => {
    const result = await createPaymentForManager(adminClient, ROLES.TEACHER, actor, {
      subscribed_semester_id: subscriptionId,
      amount: 100,
      currency: "USD",
      method: "bank_transfer",
      paid_at: "2026-07-09T12:00",
    });

    expect(result).toEqual({ success: false, error: "Unauthorized." });
  });

  it("records payment when subscription exists", async () => {
    vi.mocked(subscribedSemesterRepository.findSubscribedSemesterById).mockResolvedValue({
      data: pendingSubscription(),
      error: null,
    });
    mockBillingLookups({ payments: [] });
    vi.mocked(paymentRepository.createPayment).mockResolvedValue({
      data: {
        id: paymentId,
        subscribed_semester_id: subscriptionId,
        amount: 100,
        currency: "USD",
        method: "bank_transfer",
        paid_at: "2026-07-09T09:00:00.000Z",
      },
      error: null,
      count: null,
      status: 201,
      statusText: "Created",
    });

    const result = await createPaymentForManager(adminClient, ROLES.MANAGER, actor, {
      subscribed_semester_id: subscriptionId,
      amount: 100,
      currency: "USD",
      method: "bank_transfer",
      paid_at: "2026-07-09T12:00",
    });

    expect(result).toEqual({ success: true, message: "Payment recorded." });
    expect(paymentRepository.createPayment).toHaveBeenCalled();
    expect(auditLogService.recordManagerAuditLog).toHaveBeenCalled();
    expect(subscribedSemesterRepository.updateSubscribedSemester).not.toHaveBeenCalled();
  });

  it("blocks create when subscription status is not pending", async () => {
    vi.mocked(subscribedSemesterRepository.findSubscribedSemesterById).mockResolvedValue({
      data: pendingSubscription({ status: SUBSCRIBED_SEMESTER_STATUSES.PAUSED }),
      error: null,
    });
    mockBillingLookups({ payments: [] });

    const result = await createPaymentForManager(adminClient, ROLES.MANAGER, actor, {
      subscribed_semester_id: subscriptionId,
      amount: 100,
      currency: "USD",
      method: "bank_transfer",
      paid_at: "2026-07-09T12:00",
    });

    expect(result).toEqual({
      success: false,
      error: "Payments are locked unless the subscription is pending.",
    });
    expect(paymentRepository.createPayment).not.toHaveBeenCalled();
  });

  it("blocks create when already fully paid", async () => {
    vi.mocked(subscribedSemesterRepository.findSubscribedSemesterById).mockResolvedValue({
      data: pendingSubscription(),
      error: null,
    });
    mockBillingLookups({ payments: [{ id: paymentId, amount: 500 }] });

    const result = await createPaymentForManager(adminClient, ROLES.MANAGER, actor, {
      subscribed_semester_id: subscriptionId,
      amount: 10,
      currency: "USD",
      method: "bank_transfer",
      paid_at: "2026-07-09T12:00",
    });

    expect(result).toEqual({
      success: false,
      error: "This semester is fully paid. New payments cannot be added.",
    });
    expect(paymentRepository.createPayment).not.toHaveBeenCalled();
  });

  it("rejects amount greater than remaining due", async () => {
    vi.mocked(subscribedSemesterRepository.findSubscribedSemesterById).mockResolvedValue({
      data: pendingSubscription(),
      error: null,
    });
    mockBillingLookups({ payments: [{ id: paymentId, amount: 400 }] });

    const result = await createPaymentForManager(adminClient, ROLES.MANAGER, actor, {
      subscribed_semester_id: subscriptionId,
      amount: 150,
      currency: "USD",
      method: "bank_transfer",
      paid_at: "2026-07-09T12:00",
    });

    expect(result).toEqual({
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: {
        amount: ["Amount cannot exceed the remaining due (100)."],
      },
    });
    expect(paymentRepository.createPayment).not.toHaveBeenCalled();
  });

  it("marks subscription paid when payment reaches owed amount", async () => {
    const newPaymentId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    vi.mocked(subscribedSemesterRepository.findSubscribedSemesterById).mockResolvedValue({
      data: pendingSubscription(),
      error: null,
    });
    vi.mocked(paymentRepository.listPaymentsBySubscribedSemesterIds)
      .mockResolvedValueOnce({
        data: [
          {
            id: paymentId,
            subscribed_semester_id: subscriptionId,
            amount: 400,
            currency: "USD",
            method: "bank_transfer",
            paid_at: "2026-07-01T00:00:00.000Z",
          },
        ],
        error: null,
      } as never)
      .mockResolvedValueOnce({
        data: [
          {
            id: paymentId,
            subscribed_semester_id: subscriptionId,
            amount: 400,
            currency: "USD",
            method: "bank_transfer",
            paid_at: "2026-07-01T00:00:00.000Z",
          },
          {
            id: newPaymentId,
            subscribed_semester_id: subscriptionId,
            amount: 100,
            currency: "USD",
            method: "bank_transfer",
            paid_at: "2026-07-09T09:00:00.000Z",
          },
        ],
        error: null,
      } as never);
    vi.mocked(
      accountSpecialCaseRepository.findSpecialCaseByAccountAndSemester
    ).mockResolvedValue({
      data: null,
      error: null,
    } as never);
    vi.mocked(paymentRepository.createPayment).mockResolvedValue({
      data: {
        id: newPaymentId,
        subscribed_semester_id: subscriptionId,
        amount: 100,
        currency: "USD",
        method: "bank_transfer",
        paid_at: "2026-07-09T09:00:00.000Z",
      },
      error: null,
      count: null,
      status: 201,
      statusText: "Created",
    });
    vi.mocked(subscribedSemesterRepository.updateSubscribedSemester).mockResolvedValue({
      data: pendingSubscription({ status: SUBSCRIBED_SEMESTER_STATUSES.PAID }),
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const result = await createPaymentForManager(adminClient, ROLES.MANAGER, actor, {
      subscribed_semester_id: subscriptionId,
      amount: 100,
      currency: "USD",
      method: "bank_transfer",
      paid_at: "2026-07-09T12:00",
    });

    expect(result).toEqual({ success: true, message: "Payment recorded." });
    expect(subscribedSemesterRepository.updateSubscribedSemester).toHaveBeenCalledWith(
      adminClient,
      subscriptionId,
      {
        amount: 500,
        status: SUBSCRIBED_SEMESTER_STATUSES.PAID,
      }
    );
  });

  it("rolls back payment when status sync fails", async () => {
    const newPaymentId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    vi.mocked(subscribedSemesterRepository.findSubscribedSemesterById).mockResolvedValue({
      data: pendingSubscription(),
      error: null,
    });
    vi.mocked(paymentRepository.listPaymentsBySubscribedSemesterIds)
      .mockResolvedValueOnce({
        data: [
          {
            id: paymentId,
            subscribed_semester_id: subscriptionId,
            amount: 400,
            currency: "USD",
            method: "bank_transfer",
            paid_at: "2026-07-01T00:00:00.000Z",
          },
        ],
        error: null,
      } as never)
      .mockResolvedValueOnce({
        data: [
          {
            id: paymentId,
            subscribed_semester_id: subscriptionId,
            amount: 400,
            currency: "USD",
            method: "bank_transfer",
            paid_at: "2026-07-01T00:00:00.000Z",
          },
          {
            id: newPaymentId,
            subscribed_semester_id: subscriptionId,
            amount: 100,
            currency: "USD",
            method: "bank_transfer",
            paid_at: "2026-07-09T09:00:00.000Z",
          },
        ],
        error: null,
      } as never);
    vi.mocked(
      accountSpecialCaseRepository.findSpecialCaseByAccountAndSemester
    ).mockResolvedValue({
      data: null,
      error: null,
    } as never);
    vi.mocked(paymentRepository.createPayment).mockResolvedValue({
      data: {
        id: newPaymentId,
        subscribed_semester_id: subscriptionId,
        amount: 100,
        currency: "USD",
        method: "bank_transfer",
        paid_at: "2026-07-09T09:00:00.000Z",
      },
      error: null,
      count: null,
      status: 201,
      statusText: "Created",
    });
    vi.mocked(subscribedSemesterRepository.updateSubscribedSemester).mockResolvedValue({
      data: null,
      error: { message: "status sync failed" } as never,
      count: null,
      status: 500,
      statusText: "Error",
    });
    vi.mocked(paymentRepository.deletePayment).mockResolvedValue({
      data: { id: newPaymentId } as never,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const result = await createPaymentForManager(adminClient, ROLES.MANAGER, actor, {
      subscribed_semester_id: subscriptionId,
      amount: 100,
      currency: "USD",
      method: "bank_transfer",
      paid_at: "2026-07-09T12:00",
    });

    expect(result).toEqual({
      success: false,
      error: "status sync failed",
    });
    expect(paymentRepository.deletePayment).toHaveBeenCalledWith(
      adminClient,
      newPaymentId
    );
    expect(auditLogService.recordManagerAuditLog).not.toHaveBeenCalled();
  });

  it("rolls back payment when concurrent overshoot is detected", async () => {
    const newPaymentId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    const concurrentPaymentId = "bbbbbbbb-cccc-4ddd-8eee-ffffffffffff";
    vi.mocked(subscribedSemesterRepository.findSubscribedSemesterById).mockResolvedValue({
      data: pendingSubscription(),
      error: null,
    });
    // Gate sees 400 paid (100 remaining). After insert, re-sum finds concurrent overshoot.
    vi.mocked(paymentRepository.listPaymentsBySubscribedSemesterIds)
      .mockResolvedValueOnce({
        data: [
          {
            id: paymentId,
            subscribed_semester_id: subscriptionId,
            amount: 400,
            currency: "USD",
            method: "bank_transfer",
            paid_at: "2026-07-01T00:00:00.000Z",
          },
        ],
        error: null,
      } as never)
      .mockResolvedValueOnce({
        data: [
          {
            id: paymentId,
            subscribed_semester_id: subscriptionId,
            amount: 400,
            currency: "USD",
            method: "bank_transfer",
            paid_at: "2026-07-01T00:00:00.000Z",
          },
          {
            id: concurrentPaymentId,
            subscribed_semester_id: subscriptionId,
            amount: 100,
            currency: "USD",
            method: "bank_transfer",
            paid_at: "2026-07-01T00:00:00.000Z",
          },
          {
            id: newPaymentId,
            subscribed_semester_id: subscriptionId,
            amount: 100,
            currency: "USD",
            method: "bank_transfer",
            paid_at: "2026-07-09T09:00:00.000Z",
          },
        ],
        error: null,
      } as never);
    vi.mocked(
      accountSpecialCaseRepository.findSpecialCaseByAccountAndSemester
    ).mockResolvedValue({
      data: null,
      error: null,
    } as never);
    vi.mocked(paymentRepository.createPayment).mockResolvedValue({
      data: {
        id: newPaymentId,
        subscribed_semester_id: subscriptionId,
        amount: 100,
        currency: "USD",
        method: "bank_transfer",
        paid_at: "2026-07-09T09:00:00.000Z",
      },
      error: null,
      count: null,
      status: 201,
      statusText: "Created",
    });
    vi.mocked(paymentRepository.deletePayment).mockResolvedValue({
      data: { id: newPaymentId } as never,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const result = await createPaymentForManager(adminClient, ROLES.MANAGER, actor, {
      subscribed_semester_id: subscriptionId,
      amount: 100,
      currency: "USD",
      method: "bank_transfer",
      paid_at: "2026-07-09T12:00",
    });

    expect(result).toEqual({
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: {
        amount: [
          "Amount exceeds the remaining due after a concurrent update (100).",
        ],
      },
    });
    expect(paymentRepository.deletePayment).toHaveBeenCalledWith(
      adminClient,
      newPaymentId
    );
    expect(subscribedSemesterRepository.updateSubscribedSemester).not.toHaveBeenCalled();
  });
});

describe("updatePaymentForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("returns not found when payment is missing", async () => {
    vi.mocked(paymentRepository.findPaymentById).mockResolvedValue({
      data: null,
      error: null,
    });

    const result = await updatePaymentForManager(adminClient, ROLES.MANAGER, actor, {
      id: paymentId,
      amount: 50,
      currency: "USD",
      method: "bank_transfer",
      paid_at: "2026-07-09T12:00",
    });

    expect(result).toEqual({ success: false, error: "Payment not found." });
  });

  it("caps update amount using other payments plus remaining due", async () => {
    const otherPaymentId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    vi.mocked(paymentRepository.findPaymentById).mockResolvedValue({
      data: {
        id: paymentId,
        subscribed_semester_id: subscriptionId,
        amount: 100,
        currency: "USD",
        method: "bank_transfer",
        paid_at: "2026-07-01T00:00:00.000Z",
      },
      error: null,
    });
    vi.mocked(subscribedSemesterRepository.findSubscribedSemesterById).mockResolvedValue({
      data: pendingSubscription(),
      error: null,
    });
    mockBillingLookups({
      payments: [
        { id: paymentId, amount: 100 },
        { id: otherPaymentId, amount: 350 },
      ],
    });

    const result = await updatePaymentForManager(adminClient, ROLES.MANAGER, actor, {
      id: paymentId,
      amount: 200,
      currency: "USD",
      method: "bank_transfer",
      paid_at: "2026-07-09T12:00",
    });

    expect(result).toEqual({
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: {
        amount: ["Amount cannot exceed the remaining due (150)."],
      },
    });
    expect(paymentRepository.updatePayment).not.toHaveBeenCalled();
  });

  it("caps update amount using special-case owed amount", async () => {
    vi.mocked(paymentRepository.findPaymentById).mockResolvedValue({
      data: {
        id: paymentId,
        subscribed_semester_id: subscriptionId,
        amount: 50,
        currency: "USD",
        method: "bank_transfer",
        paid_at: "2026-07-01T00:00:00.000Z",
      },
      error: null,
    });
    vi.mocked(subscribedSemesterRepository.findSubscribedSemesterById).mockResolvedValue({
      data: pendingSubscription(),
      error: null,
    });
    mockBillingLookups({
      payments: [{ id: paymentId, amount: 50 }],
      specialCase: {
        status: ACCOUNT_SPECIAL_CASE_STATUSES.ACTIVE,
        total_amount: 200,
      },
    });

    const result = await updatePaymentForManager(adminClient, ROLES.MANAGER, actor, {
      id: paymentId,
      amount: 250,
      currency: "USD",
      method: "bank_transfer",
      paid_at: "2026-07-09T12:00",
    });

    expect(result).toEqual({
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: {
        amount: ["Amount cannot exceed the remaining due (200)."],
      },
    });
  });

  it("reopens paid subscription to pending when edit reduces total below owed", async () => {
    vi.mocked(paymentRepository.findPaymentById).mockResolvedValue({
      data: {
        id: paymentId,
        subscribed_semester_id: subscriptionId,
        amount: 500,
        currency: "USD",
        method: "bank_transfer",
        paid_at: "2026-07-01T00:00:00.000Z",
      },
      error: null,
    });
    vi.mocked(subscribedSemesterRepository.findSubscribedSemesterById).mockResolvedValue({
      data: pendingSubscription({ status: SUBSCRIBED_SEMESTER_STATUSES.PAID }),
      error: null,
    });
    mockBillingLookups({ payments: [{ id: paymentId, amount: 500 }] });
    vi.mocked(paymentRepository.updatePayment).mockResolvedValue({
      data: {
        id: paymentId,
        subscribed_semester_id: subscriptionId,
        amount: 200,
        currency: "USD",
        method: "bank_transfer",
        paid_at: "2026-07-09T09:00:00.000Z",
      },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(subscribedSemesterRepository.updateSubscribedSemester).mockResolvedValue({
      data: pendingSubscription({ status: SUBSCRIBED_SEMESTER_STATUSES.PENDING }),
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const result = await updatePaymentForManager(adminClient, ROLES.MANAGER, actor, {
      id: paymentId,
      amount: 200,
      currency: "USD",
      method: "bank_transfer",
      paid_at: "2026-07-09T12:00",
    });

    expect(result).toEqual({ success: true, message: "Payment updated." });
    expect(subscribedSemesterRepository.updateSubscribedSemester).toHaveBeenCalledWith(
      adminClient,
      subscriptionId,
      {
        amount: 500,
        status: SUBSCRIBED_SEMESTER_STATUSES.PENDING,
      }
    );
  });
});

describe("deletePaymentForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("blocks delete when subscription is paused", async () => {
    vi.mocked(paymentRepository.findPaymentById).mockResolvedValue({
      data: {
        id: paymentId,
        subscribed_semester_id: subscriptionId,
        amount: 100,
        currency: "USD",
        method: "bank_transfer",
        paid_at: "2026-07-01T00:00:00.000Z",
      },
      error: null,
    });
    vi.mocked(subscribedSemesterRepository.findSubscribedSemesterById).mockResolvedValue({
      data: pendingSubscription({ status: SUBSCRIBED_SEMESTER_STATUSES.PAUSED }),
      error: null,
    });
    mockBillingLookups({ payments: [{ id: paymentId, amount: 100 }] });

    const result = await deletePaymentForManager(adminClient, ROLES.MANAGER, actor, {
      id: paymentId,
    });

    expect(result).toEqual({
      success: false,
      error: "Payments can only be deleted when the subscription is pending or paid.",
    });
    expect(paymentRepository.deletePayment).not.toHaveBeenCalled();
  });

  it("reopens paid subscription to pending when delete underpays", async () => {
    vi.mocked(paymentRepository.findPaymentById).mockResolvedValue({
      data: {
        id: paymentId,
        subscribed_semester_id: subscriptionId,
        amount: 500,
        currency: "USD",
        method: "bank_transfer",
        paid_at: "2026-07-01T00:00:00.000Z",
      },
      error: null,
    });
    vi.mocked(subscribedSemesterRepository.findSubscribedSemesterById).mockResolvedValue({
      data: pendingSubscription({ status: SUBSCRIBED_SEMESTER_STATUSES.PAID }),
      error: null,
    });
    mockBillingLookups({ payments: [{ id: paymentId, amount: 500 }] });
    vi.mocked(paymentRepository.deletePayment).mockResolvedValue({
      data: {
        id: paymentId,
        subscribed_semester_id: subscriptionId,
        amount: 500,
        currency: "USD",
        method: "bank_transfer",
        paid_at: "2026-07-01T00:00:00.000Z",
      },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(subscribedSemesterRepository.updateSubscribedSemester).mockResolvedValue({
      data: pendingSubscription({ status: SUBSCRIBED_SEMESTER_STATUSES.PENDING }),
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const result = await deletePaymentForManager(adminClient, ROLES.MANAGER, actor, {
      id: paymentId,
    });

    expect(result).toEqual({ success: true, message: "Payment deleted." });
    expect(paymentRepository.deletePayment).toHaveBeenCalledWith(adminClient, paymentId);
    expect(subscribedSemesterRepository.updateSubscribedSemester).toHaveBeenCalledWith(
      adminClient,
      subscriptionId,
      {
        amount: 500,
        status: SUBSCRIBED_SEMESTER_STATUSES.PENDING,
      }
    );
  });
});

describe("createScheduledPaymentForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("blocks schedule create when subscription is locked", async () => {
    vi.mocked(subscribedSemesterRepository.findSubscribedSemesterById).mockResolvedValue({
      data: pendingSubscription({ status: SUBSCRIBED_SEMESTER_STATUSES.PAID }),
      error: null,
    });
    mockBillingLookups({ payments: [] });

    const result = await createScheduledPaymentForManager(
      adminClient,
      ROLES.MANAGER,
      actor,
      {
        subscribed_semester_id: subscriptionId,
        payment_date: "2026-08-01T12:00",
        amount: 50,
        status: SCHEDULED_PAYMENT_STATUSES.SCHEDULED,
      }
    );

    expect(result).toEqual({
      success: false,
      error: "Schedules are locked unless the subscription is pending.",
    });
    expect(scheduledPaymentRepository.createScheduledPayment).not.toHaveBeenCalled();
  });

  it("rejects schedule amount greater than remaining due", async () => {
    vi.mocked(subscribedSemesterRepository.findSubscribedSemesterById).mockResolvedValue({
      data: pendingSubscription(),
      error: null,
    });
    mockBillingLookups({ payments: [{ id: paymentId, amount: 400 }] });

    const result = await createScheduledPaymentForManager(
      adminClient,
      ROLES.MANAGER,
      actor,
      {
        subscribed_semester_id: subscriptionId,
        payment_date: "2026-08-01T12:00",
        amount: 150,
        status: SCHEDULED_PAYMENT_STATUSES.SCHEDULED,
      }
    );

    expect(result).toEqual({
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: {
        amount: ["Amount cannot exceed the remaining due (100)."],
      },
    });
    expect(scheduledPaymentRepository.createScheduledPayment).not.toHaveBeenCalled();
  });
});

describe("updateScheduledPaymentForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("blocks schedule update when fully paid", async () => {
    vi.mocked(scheduledPaymentRepository.findScheduledPaymentById).mockResolvedValue({
      data: {
        id: scheduledPaymentId,
        subscribed_semester_id: subscriptionId,
        payment_date: "2026-08-01T00:00:00.000Z",
        amount: 50,
        status: SCHEDULED_PAYMENT_STATUSES.SCHEDULED,
        note: null,
      },
      error: null,
    } as never);
    vi.mocked(subscribedSemesterRepository.findSubscribedSemesterById).mockResolvedValue({
      data: pendingSubscription(),
      error: null,
    });
    mockBillingLookups({ payments: [{ id: paymentId, amount: 500 }] });

    const result = await updateScheduledPaymentForManager(
      adminClient,
      ROLES.MANAGER,
      actor,
      {
        id: scheduledPaymentId,
        payment_date: "2026-08-02T12:00",
        amount: 50,
        status: SCHEDULED_PAYMENT_STATUSES.SCHEDULED,
      }
    );

    expect(result).toEqual({
      success: false,
      error: "This semester is fully paid. Payments and schedules cannot be changed.",
    });
    expect(scheduledPaymentRepository.updateScheduledPayment).not.toHaveBeenCalled();
  });
});

describe("updateSubscribedSemesterForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("updates subscription when it exists", async () => {
    vi.mocked(subscribedSemesterRepository.findSubscribedSemesterById).mockResolvedValue({
      data: {
        id: subscriptionId,
        account_id: accountId,
        semester_id: semesterId,
        amount: 500,
        status: SUBSCRIBED_SEMESTER_STATUSES.PENDING,
        created_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
    });
    vi.mocked(subscribedSemesterRepository.updateSubscribedSemester).mockResolvedValue({
      data: {
        id: subscriptionId,
        account_id: accountId,
        semester_id: semesterId,
        amount: 600,
        status: SUBSCRIBED_SEMESTER_STATUSES.PAUSED,
        created_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    mockBillingLookups({ payments: [] });

    const result = await updateSubscribedSemesterForManager(
      adminClient,
      ROLES.MANAGER,
      actor,
      {
        id: subscriptionId,
        amount: 600,
        status: SUBSCRIBED_SEMESTER_STATUSES.PAUSED,
      }
    );

    expect(result).toEqual({
      success: true,
      message: "Subscribed semester updated.",
    });
    expect(auditLogService.recordManagerAuditLog).toHaveBeenCalled();
  });

  it("rejects setting status to paid manually", async () => {
    vi.mocked(subscribedSemesterRepository.findSubscribedSemesterById).mockResolvedValue({
      data: pendingSubscription(),
      error: null,
    });

    const result = await updateSubscribedSemesterForManager(
      adminClient,
      ROLES.MANAGER,
      actor,
      {
        id: subscriptionId,
        amount: 500,
        status: SUBSCRIBED_SEMESTER_STATUSES.PAID,
      }
    );

    expect(result).toEqual({
      success: false,
      error:
        "Paid status is set automatically when payments cover the amount owed.",
    });
    expect(subscribedSemesterRepository.updateSubscribedSemester).not.toHaveBeenCalled();
  });

  it("rejects changing status away from paid", async () => {
    vi.mocked(subscribedSemesterRepository.findSubscribedSemesterById).mockResolvedValue({
      data: pendingSubscription({ status: SUBSCRIBED_SEMESTER_STATUSES.PAID }),
      error: null,
    });

    const result = await updateSubscribedSemesterForManager(
      adminClient,
      ROLES.MANAGER,
      actor,
      {
        id: subscriptionId,
        amount: 500,
        status: SUBSCRIBED_SEMESTER_STATUSES.PENDING,
      }
    );

    expect(result).toEqual({
      success: false,
      error: "Paid subscriptions cannot change status.",
    });
    expect(subscribedSemesterRepository.updateSubscribedSemester).not.toHaveBeenCalled();
  });

  it("reopens paid subscription to pending when amount rises above paid total", async () => {
    vi.mocked(subscribedSemesterRepository.findSubscribedSemesterById).mockResolvedValue({
      data: pendingSubscription({ status: SUBSCRIBED_SEMESTER_STATUSES.PAID }),
      error: null,
    });
    vi.mocked(subscribedSemesterRepository.updateSubscribedSemester)
      .mockResolvedValueOnce({
        data: pendingSubscription({
          amount: 800,
          status: SUBSCRIBED_SEMESTER_STATUSES.PAID,
        }),
        error: null,
        count: null,
        status: 200,
        statusText: "OK",
      })
      .mockResolvedValueOnce({
        data: pendingSubscription({
          amount: 800,
          status: SUBSCRIBED_SEMESTER_STATUSES.PENDING,
        }),
        error: null,
        count: null,
        status: 200,
        statusText: "OK",
      });
    mockBillingLookups({ payments: [{ id: paymentId, amount: 500 }] });

    const result = await updateSubscribedSemesterForManager(
      adminClient,
      ROLES.MANAGER,
      actor,
      {
        id: subscriptionId,
        amount: 800,
        status: SUBSCRIBED_SEMESTER_STATUSES.PAID,
      }
    );

    expect(result).toEqual({
      success: true,
      message: "Subscribed semester updated.",
    });
    expect(subscribedSemesterRepository.updateSubscribedSemester).toHaveBeenCalledWith(
      adminClient,
      subscriptionId,
      {
        amount: 800,
        status: SUBSCRIBED_SEMESTER_STATUSES.PENDING,
      }
    );
  });
});
describe("getStudentAccountForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns null when student profile is missing", async () => {
    vi.mocked(studentProfileRepository.findStudentProfileById).mockResolvedValue({
      data: null,
      error: null,
    });

    const result = await getStudentAccountForManager(
      adminClient,
      ROLES.MANAGER,
      studentProfileId
    );

    expect(result).toBeNull();
  });

  it("returns account details with subscriptions and payments", async () => {
    vi.mocked(studentProfileRepository.findStudentProfileById).mockResolvedValue({
      data: { id: studentProfileId, user_id: userId },
      error: null,
    });
    vi.mocked(studentService.listStudentsForManager).mockResolvedValue([
      {
        student_profile_id: studentProfileId,
        user_id: userId,
        full_name: "Jane Doe",
        email: "jane@example.com",
        phone: null,
      },
    ]);
    vi.mocked(accountRepository.findAccountByUserId).mockResolvedValue({
      data: {
        id: accountId,
        user_id: userId,
        opened_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
    });
    vi.mocked(studentSemesterRepository.listEnrollmentsByStudentProfileId).mockResolvedValue({
      data: [],
      error: null,
    });
    vi.mocked(subscribedSemesterRepository.listSubscribedSemestersByAccountId).mockResolvedValue({
      data: [
        {
          id: subscriptionId,
          account_id: accountId,
          semester_id: semesterId,
          amount: 500,
          status: SUBSCRIBED_SEMESTER_STATUSES.PENDING,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      error: null,
    });
    vi.mocked(semesterRepository.listSemesters).mockResolvedValue({
      data: [{ id: semesterId, name: "Fall 2026", amount: 500 }],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(paymentRepository.listPaymentsBySubscribedSemesterIds).mockResolvedValue({
      data: [
        {
          id: paymentId,
          subscribed_semester_id: subscriptionId,
          amount: 200,
          currency: "USD",
          method: "bank_transfer",
          paid_at: "2026-02-01T00:00:00.000Z",
        },
      ],
      error: null,
    });
    vi.mocked(
      scheduledPaymentRepository.listScheduledPaymentsBySubscribedSemesterIds
    ).mockResolvedValue({
      data: [],
      error: null,
    });
    vi.mocked(
      accountSpecialCaseRepository.listSpecialCasesByAccountId
    ).mockResolvedValue({
      data: [],
      error: null,
    });

    const result = await getStudentAccountForManager(
      adminClient,
      ROLES.MANAGER,
      studentProfileId
    );

    expect(result?.overview.full_name).toBe("Jane Doe");
    expect(result?.subscriptions).toHaveLength(1);
    expect(result?.subscriptions[0]?.paid_amount).toBe(200);
    expect(result?.payments).toHaveLength(1);
  });
});

describe("createAccountSpecialCaseForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
    vi.mocked(
      subscribedSemesterService.ensureSubscribedSemesterForAccount
    ).mockResolvedValue(pendingSubscription() as never);
  });

  it("syncs subscription to paid when active special total_amount is 0", async () => {
    const specialCaseId = "11111111-2222-4333-8444-555555555555";
    const createdSpecial = {
      id: specialCaseId,
      account_id: accountId,
      semester_id: semesterId,
      total_amount: 0,
      percentage_discount: 100,
      explanation: "Full scholarship",
      approved_by: actor.userId,
      case_type: ACCOUNT_SPECIAL_CASE_TYPES.SCHOLARSHIP,
      status: ACCOUNT_SPECIAL_CASE_STATUSES.ACTIVE,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    };
    vi.mocked(accountRepository.findAccountById).mockResolvedValue({
      data: {
        id: accountId,
        user_id: userId,
        opened_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
    });
    vi.mocked(semesterRepository.findSemesterById).mockResolvedValue({
      data: {
        id: semesterId,
        name: "Fall 2026",
        nb_courses: 1,
        amount: 500,
        created_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
    });
    vi.mocked(accountSpecialCaseRepository.findSpecialCaseByAccountAndSemester)
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: createdSpecial, error: null } as never);
    vi.mocked(accountSpecialCaseRepository.createSpecialCase).mockResolvedValue({
      data: createdSpecial,
      error: null,
    } as never);
    vi.mocked(paymentRepository.listPaymentsBySubscribedSemesterIds).mockResolvedValue({
      data: [],
      error: null,
    } as never);
    vi.mocked(subscribedSemesterRepository.updateSubscribedSemester).mockResolvedValue({
      data: pendingSubscription({ status: SUBSCRIBED_SEMESTER_STATUSES.PAID }),
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const result = await createAccountSpecialCaseForManager(
      adminClient,
      ROLES.MANAGER,
      actor,
      {
        account_id: accountId,
        semester_id: semesterId,
        total_amount: 0,
        explanation: "Full scholarship",
        case_type: ACCOUNT_SPECIAL_CASE_TYPES.SCHOLARSHIP,
        status: ACCOUNT_SPECIAL_CASE_STATUSES.ACTIVE,
      }
    );

    expect(result).toEqual({
      success: true,
      message: "Special case created.",
    });
    expect(subscribedSemesterRepository.updateSubscribedSemester).toHaveBeenCalledWith(
      adminClient,
      subscriptionId,
      {
        amount: 500,
        status: SUBSCRIBED_SEMESTER_STATUSES.PAID,
      }
    );
  });

  it("marks paid when payments already cover special owed amount", async () => {
    const specialCaseId = "11111111-2222-4333-8444-555555555555";
    const createdSpecial = {
      id: specialCaseId,
      account_id: accountId,
      semester_id: semesterId,
      total_amount: 200,
      percentage_discount: 60,
      explanation: "Partial scholarship",
      approved_by: actor.userId,
      case_type: ACCOUNT_SPECIAL_CASE_TYPES.SCHOLARSHIP,
      status: ACCOUNT_SPECIAL_CASE_STATUSES.ACTIVE,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    };
    vi.mocked(accountRepository.findAccountById).mockResolvedValue({
      data: {
        id: accountId,
        user_id: userId,
        opened_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
    });
    vi.mocked(semesterRepository.findSemesterById).mockResolvedValue({
      data: {
        id: semesterId,
        name: "Fall 2026",
        nb_courses: 1,
        amount: 500,
        created_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
    });
    vi.mocked(accountSpecialCaseRepository.findSpecialCaseByAccountAndSemester)
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: createdSpecial, error: null } as never);
    vi.mocked(accountSpecialCaseRepository.createSpecialCase).mockResolvedValue({
      data: createdSpecial,
      error: null,
    } as never);
    vi.mocked(paymentRepository.listPaymentsBySubscribedSemesterIds).mockResolvedValue({
      data: [
        {
          id: paymentId,
          subscribed_semester_id: subscriptionId,
          amount: 200,
          currency: "USD",
          method: "bank_transfer",
          paid_at: "2026-07-01T00:00:00.000Z",
        },
      ],
      error: null,
    } as never);
    vi.mocked(subscribedSemesterRepository.updateSubscribedSemester).mockResolvedValue({
      data: pendingSubscription({ status: SUBSCRIBED_SEMESTER_STATUSES.PAID }),
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const result = await createAccountSpecialCaseForManager(
      adminClient,
      ROLES.MANAGER,
      actor,
      {
        account_id: accountId,
        semester_id: semesterId,
        total_amount: 200,
        explanation: "Partial scholarship",
        case_type: ACCOUNT_SPECIAL_CASE_TYPES.SCHOLARSHIP,
        status: ACCOUNT_SPECIAL_CASE_STATUSES.ACTIVE,
      }
    );

    expect(result.success).toBe(true);
    expect(subscribedSemesterRepository.updateSubscribedSemester).toHaveBeenCalledWith(
      adminClient,
      subscriptionId,
      {
        amount: 500,
        status: SUBSCRIBED_SEMESTER_STATUSES.PAID,
      }
    );
  });

  it("does not force paid when special is inactive with total_amount 0", async () => {
    const specialCaseId = "11111111-2222-4333-8444-555555555555";
    const createdSpecial = {
      id: specialCaseId,
      account_id: accountId,
      semester_id: semesterId,
      total_amount: 0,
      percentage_discount: 100,
      explanation: "Inactive zero",
      approved_by: actor.userId,
      case_type: ACCOUNT_SPECIAL_CASE_TYPES.SCHOLARSHIP,
      status: ACCOUNT_SPECIAL_CASE_STATUSES.INACTIVE,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    };
    vi.mocked(
      subscribedSemesterService.ensureSubscribedSemesterForAccount
    ).mockResolvedValue(
      pendingSubscription({ status: SUBSCRIBED_SEMESTER_STATUSES.PAUSED }) as never
    );
    vi.mocked(accountRepository.findAccountById).mockResolvedValue({
      data: {
        id: accountId,
        user_id: userId,
        opened_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
    });
    vi.mocked(semesterRepository.findSemesterById).mockResolvedValue({
      data: {
        id: semesterId,
        name: "Fall 2026",
        nb_courses: 1,
        amount: 500,
        created_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
    });
    vi.mocked(accountSpecialCaseRepository.findSpecialCaseByAccountAndSemester)
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: createdSpecial, error: null } as never);
    vi.mocked(accountSpecialCaseRepository.createSpecialCase).mockResolvedValue({
      data: createdSpecial,
      error: null,
    } as never);
    vi.mocked(paymentRepository.listPaymentsBySubscribedSemesterIds).mockResolvedValue({
      data: [],
      error: null,
    } as never);

    const result = await createAccountSpecialCaseForManager(
      adminClient,
      ROLES.MANAGER,
      actor,
      {
        account_id: accountId,
        semester_id: semesterId,
        total_amount: 0,
        explanation: "Inactive zero",
        case_type: ACCOUNT_SPECIAL_CASE_TYPES.SCHOLARSHIP,
        status: ACCOUNT_SPECIAL_CASE_STATUSES.INACTIVE,
      }
    );

    expect(result.success).toBe(true);
    expect(subscribedSemesterRepository.updateSubscribedSemester).not.toHaveBeenCalled();
  });
});
