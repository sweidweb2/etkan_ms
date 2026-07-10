import { describe, expect, it, vi, beforeEach } from "vitest";
import { ROLES } from "@/lib/constants/roles";
import { SUBSCRIBED_SEMESTER_STATUSES } from "@/lib/constants/manager-subscribed-semester-status";
import * as accountRepository from "@/repositories/account.repository";
import * as paymentRepository from "@/repositories/payment.repository";
import * as scheduledPaymentRepository from "@/repositories/scheduled-payment.repository";
import * as semesterRepository from "@/repositories/semester.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import * as studentSemesterRepository from "@/repositories/student-semester.repository";
import * as subscribedSemesterRepository from "@/repositories/subscribed-semester.repository";
import * as studentService from "@/services/student.service";
import {
  createPaymentForManager,
  getStudentAccountForManager,
  updatePaymentForManager,
  updateSubscribedSemesterForManager,
} from "@/services/accounting.service";

vi.mock("@/repositories/account.repository");
vi.mock("@/repositories/payment.repository");
vi.mock("@/repositories/scheduled-payment.repository");
vi.mock("@/repositories/semester.repository");
vi.mock("@/repositories/student-profile.repository");
vi.mock("@/repositories/student-semester.repository");
vi.mock("@/repositories/subscribed-semester.repository");
vi.mock("@/services/student.service");

const adminClient = {} as never;
const studentProfileId = "b2b3b4b5-b6b7-4890-bcde-f23456789012";
const userId = "c3c4c5c6-c7c8-4901-cdef-345678901234";
const accountId = "d4d5d6d7-d8d9-4012-defa-456789012345";
const subscriptionId = "e5e6e7e8-e9e0-4123-8fab-567890123456";
const paymentId = "f6f7f8f9-f0f1-4234-9abc-678901234567";
const semesterId = "a7a8a9a0-a1a2-4456-8bcd-789012345678";

describe("createPaymentForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns unauthorized for non-manager", async () => {
    const result = await createPaymentForManager(adminClient, ROLES.TEACHER, {
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
      data: {
        id: subscriptionId,
        account_id: accountId,
        semester_id: semesterId,
        amount: 500,
        status: SUBSCRIBED_SEMESTER_STATUSES.ACTIVE,
        created_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
    });
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

    const result = await createPaymentForManager(adminClient, ROLES.MANAGER, {
      subscribed_semester_id: subscriptionId,
      amount: 100,
      currency: "USD",
      method: "bank_transfer",
      paid_at: "2026-07-09T12:00",
    });

    expect(result).toEqual({ success: true, message: "Payment recorded." });
    expect(paymentRepository.createPayment).toHaveBeenCalled();
  });
});

describe("updatePaymentForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns not found when payment is missing", async () => {
    vi.mocked(paymentRepository.findPaymentById).mockResolvedValue({
      data: null,
      error: null,
    });

    const result = await updatePaymentForManager(adminClient, ROLES.MANAGER, {
      id: paymentId,
      amount: 50,
      currency: "USD",
      method: "bank_transfer",
      paid_at: "2026-07-09T12:00",
    });

    expect(result).toEqual({ success: false, error: "Payment not found." });
  });
});

describe("updateSubscribedSemesterForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("updates subscription when it exists", async () => {
    vi.mocked(subscribedSemesterRepository.findSubscribedSemesterById).mockResolvedValue({
      data: {
        id: subscriptionId,
        account_id: accountId,
        semester_id: semesterId,
        amount: 500,
        status: SUBSCRIBED_SEMESTER_STATUSES.ACTIVE,
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
        status: SUBSCRIBED_SEMESTER_STATUSES.OVERDUE,
        created_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const result = await updateSubscribedSemesterForManager(adminClient, ROLES.MANAGER, {
      id: subscriptionId,
      amount: 600,
      status: SUBSCRIBED_SEMESTER_STATUSES.OVERDUE,
    });

    expect(result).toEqual({
      success: true,
      message: "Subscribed semester updated.",
    });
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
          status: SUBSCRIBED_SEMESTER_STATUSES.ACTIVE,
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
