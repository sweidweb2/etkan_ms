import { describe, expect, it, vi, beforeEach } from "vitest";
import { SUBSCRIBED_SEMESTER_STATUSES } from "@/lib/constants/manager-subscribed-semester-status";
import * as accountRepository from "@/repositories/account.repository";
import * as accountSpecialCaseRepository from "@/repositories/account-special-case.repository";
import * as paymentRepository from "@/repositories/payment.repository";
import * as semesterRepository from "@/repositories/semester.repository";
import * as studentClassRepository from "@/repositories/student-class.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import * as subscribedSemesterRepository from "@/repositories/subscribed-semester.repository";
import {
  ensureSubscribedSemesterForAccount,
  ensureSubscribedSemesterForStudent,
  markSubscribedSemesterPaidForAccount,
  reassignClassStudentsSubscribedSemesters,
} from "@/services/subscribed-semester.service";

vi.mock("@/repositories/account.repository");
vi.mock("@/repositories/account-special-case.repository");
vi.mock("@/repositories/payment.repository");
vi.mock("@/repositories/semester.repository");
vi.mock("@/repositories/student-class.repository");
vi.mock("@/repositories/student-profile.repository");
vi.mock("@/repositories/subscribed-semester.repository");

const adminClient = {} as never;
const accountId = "d4d5d6d7-d8d9-4012-8efa-456789012345";
const semesterId = "a7a8a9a0-a1a2-4456-8bcd-789012345678";
const nextSemesterId = "b8b9bab0-b2b3-4567-9cde-890123456789";
const studentProfileId = "b2b3b4b5-b6b7-4890-8cde-f23456789012";
const userId = "c3c4c5c6-c7c8-4901-8def-345678901234";
const subscriptionId = "e5e6e7e8-e9e0-4123-8fab-567890123456";
const nextSubscriptionId = "f6f7f8f9-f0f1-4234-9abc-678901234567";
const classId = "f1f2f3f4-f5f6-4789-8abc-901234567890";

const existingSubscription = {
  id: subscriptionId,
  account_id: accountId,
  semester_id: semesterId,
  amount: 500,
  status: SUBSCRIBED_SEMESTER_STATUSES.PENDING,
  created_at: "2026-01-01T00:00:00.000Z",
};

function mockBillingLookups(options?: {
  payments?: Array<{ id: string; amount: number }>;
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
    data: null,
    error: null,
  } as never);
}

describe("ensureSubscribedSemesterForAccount", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns existing subscription without creating", async () => {
    vi.mocked(
      subscribedSemesterRepository.findSubscribedSemesterByAccountAndSemester
    ).mockResolvedValue({
      data: existingSubscription,
      error: null,
    });

    const result = await ensureSubscribedSemesterForAccount(
      adminClient,
      accountId,
      semesterId
    );

    expect(result).toEqual(existingSubscription);
    expect(
      subscribedSemesterRepository.createSubscribedSemester
    ).not.toHaveBeenCalled();
  });

  it("creates pending subscription when missing", async () => {
    vi.mocked(
      subscribedSemesterRepository.findSubscribedSemesterByAccountAndSemester
    ).mockResolvedValue({
      data: null,
      error: null,
    });
    vi.mocked(semesterRepository.findSemesterById).mockResolvedValue({
      data: {
        id: semesterId,
        name: "Fall 2026",
        nb_courses: 2,
        amount: 500,
        created_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
    });
    vi.mocked(
      subscribedSemesterRepository.createSubscribedSemester
    ).mockResolvedValue({
      data: existingSubscription,
      error: null,
    });

    const result = await ensureSubscribedSemesterForAccount(
      adminClient,
      accountId,
      semesterId
    );

    expect(result).toEqual(existingSubscription);
    expect(
      subscribedSemesterRepository.createSubscribedSemester
    ).toHaveBeenCalledWith(adminClient, {
      account_id: accountId,
      semester_id: semesterId,
      amount: 500,
      status: SUBSCRIBED_SEMESTER_STATUSES.PENDING,
    });
  });
});

describe("ensureSubscribedSemesterForStudent", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("resolves account then ensures subscription", async () => {
    vi.mocked(studentProfileRepository.findStudentProfileById).mockResolvedValue({
      data: {
        id: studentProfileId,
        user_id: userId,
        full_name: "Student",
        birth_date: null,
        phone: null,
        status: "active",
        created_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
    });
    vi.mocked(accountRepository.findAccountByUserId).mockResolvedValue({
      data: {
        id: accountId,
        user_id: userId,
        opened_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
    });
    vi.mocked(
      subscribedSemesterRepository.findSubscribedSemesterByAccountAndSemester
    ).mockResolvedValue({
      data: existingSubscription,
      error: null,
    });

    const result = await ensureSubscribedSemesterForStudent(
      adminClient,
      studentProfileId,
      semesterId
    );

    expect(result).toEqual(existingSubscription);
    expect(accountRepository.createAccount).not.toHaveBeenCalled();
  });

  it("creates account then subscription when account is missing", async () => {
    vi.mocked(studentProfileRepository.findStudentProfileById).mockResolvedValue({
      data: {
        id: studentProfileId,
        user_id: userId,
        full_name: "Student",
        birth_date: null,
        phone: null,
        status: "active",
        created_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
    });
    vi.mocked(accountRepository.findAccountByUserId).mockResolvedValue({
      data: null,
      error: null,
    });
    vi.mocked(accountRepository.createAccount).mockResolvedValue({
      data: {
        id: accountId,
        user_id: userId,
        opened_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
      count: null,
      status: 201,
      statusText: "Created",
    });
    vi.mocked(
      subscribedSemesterRepository.findSubscribedSemesterByAccountAndSemester
    ).mockResolvedValue({
      data: null,
      error: null,
    });
    vi.mocked(semesterRepository.findSemesterById).mockResolvedValue({
      data: {
        id: semesterId,
        name: "Fall 2026",
        nb_courses: 2,
        amount: 500,
        created_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
    });
    vi.mocked(
      subscribedSemesterRepository.createSubscribedSemester
    ).mockResolvedValue({
      data: existingSubscription,
      error: null,
    });

    const result = await ensureSubscribedSemesterForStudent(
      adminClient,
      studentProfileId,
      semesterId
    );

    expect(accountRepository.createAccount).toHaveBeenCalledWith(adminClient, {
      user_id: userId,
    });
    expect(result).toEqual(existingSubscription);
  });
});

describe("markSubscribedSemesterPaidForAccount", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("updates status to paid when pending", async () => {
    vi.mocked(
      subscribedSemesterRepository.findSubscribedSemesterByAccountAndSemester
    ).mockResolvedValue({
      data: existingSubscription,
      error: null,
    });
    vi.mocked(
      subscribedSemesterRepository.updateSubscribedSemester
    ).mockResolvedValue({
      data: {
        ...existingSubscription,
        status: SUBSCRIBED_SEMESTER_STATUSES.PAID,
      },
      error: null,
    });

    await markSubscribedSemesterPaidForAccount(
      adminClient,
      accountId,
      semesterId
    );

    expect(
      subscribedSemesterRepository.updateSubscribedSemester
    ).toHaveBeenCalledWith(adminClient, subscriptionId, {
      amount: 500,
      status: SUBSCRIBED_SEMESTER_STATUSES.PAID,
    });
  });

  it("skips update when already paid", async () => {
    vi.mocked(
      subscribedSemesterRepository.findSubscribedSemesterByAccountAndSemester
    ).mockResolvedValue({
      data: {
        ...existingSubscription,
        status: SUBSCRIBED_SEMESTER_STATUSES.PAID,
      },
      error: null,
    });

    await markSubscribedSemesterPaidForAccount(
      adminClient,
      accountId,
      semesterId
    );

    expect(
      subscribedSemesterRepository.updateSubscribedSemester
    ).not.toHaveBeenCalled();
  });

  it("skips update when paused", async () => {
    vi.mocked(
      subscribedSemesterRepository.findSubscribedSemesterByAccountAndSemester
    ).mockResolvedValue({
      data: {
        ...existingSubscription,
        status: SUBSCRIBED_SEMESTER_STATUSES.PAUSED,
      },
      error: null,
    });

    await markSubscribedSemesterPaidForAccount(
      adminClient,
      accountId,
      semesterId
    );

    expect(
      subscribedSemesterRepository.updateSubscribedSemester
    ).not.toHaveBeenCalled();
  });
});

describe("reassignClassStudentsSubscribedSemesters", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockBillingLookups({ payments: [] });
  });

  it("moves previous semester subscription to the new semester with new amount", async () => {
    vi.mocked(semesterRepository.findSemesterById).mockResolvedValue({
      data: {
        id: nextSemesterId,
        name: "Spring 2027",
        nb_courses: 3,
        amount: 750,
        status: "scheduled",
        created_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
    });
    vi.mocked(studentClassRepository.listStudentClassesByClassId).mockResolvedValue({
      data: [
        {
          id: "sc-1",
          user_id: userId,
          class_id: classId,
          status: "enrolled",
          joined_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      error: null,
    });
    vi.mocked(accountRepository.listAccountsByUserIds).mockResolvedValue({
      data: [
        {
          id: accountId,
          user_id: userId,
          opened_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      error: null,
    });
    vi.mocked(
      subscribedSemesterRepository.findSubscribedSemesterByAccountAndSemester
    )
      .mockResolvedValueOnce({
        data: null,
        error: null,
      })
      .mockResolvedValueOnce({
        data: existingSubscription,
        error: null,
      });
    vi.mocked(
      subscribedSemesterRepository.updateSubscribedSemesterSemesterAndAmount
    ).mockResolvedValue({
      data: {
        ...existingSubscription,
        semester_id: nextSemesterId,
        amount: 750,
      },
      error: null,
    });

    await reassignClassStudentsSubscribedSemesters(
      adminClient,
      classId,
      semesterId,
      nextSemesterId
    );

    expect(
      subscribedSemesterRepository.updateSubscribedSemesterSemesterAndAmount
    ).toHaveBeenCalledWith(adminClient, subscriptionId, {
      semester_id: nextSemesterId,
      amount: 750,
    });
  });

  it("updates next amount, syncs status, and stops leftover pending previous", async () => {
    const nextSubscription = {
      id: nextSubscriptionId,
      account_id: accountId,
      semester_id: nextSemesterId,
      amount: 500,
      status: SUBSCRIBED_SEMESTER_STATUSES.PENDING,
      created_at: "2026-01-01T00:00:00.000Z",
    };

    vi.mocked(semesterRepository.findSemesterById).mockResolvedValue({
      data: {
        id: nextSemesterId,
        name: "Spring 2027",
        nb_courses: 3,
        amount: 750,
        status: "scheduled",
        created_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
    });
    vi.mocked(studentClassRepository.listStudentClassesByClassId).mockResolvedValue({
      data: [
        {
          id: "sc-1",
          user_id: userId,
          class_id: classId,
          status: "enrolled",
          joined_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      error: null,
    });
    vi.mocked(accountRepository.listAccountsByUserIds).mockResolvedValue({
      data: [
        {
          id: accountId,
          user_id: userId,
          opened_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      error: null,
    });
    vi.mocked(
      subscribedSemesterRepository.findSubscribedSemesterByAccountAndSemester
    )
      .mockResolvedValueOnce({
        data: nextSubscription,
        error: null,
      })
      .mockResolvedValueOnce({
        data: existingSubscription,
        error: null,
      });
    vi.mocked(subscribedSemesterRepository.updateSubscribedSemester)
      .mockResolvedValueOnce({
        data: {
          ...nextSubscription,
          amount: 750,
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          ...existingSubscription,
          status: SUBSCRIBED_SEMESTER_STATUSES.STOPPED,
        },
        error: null,
      });

    await reassignClassStudentsSubscribedSemesters(
      adminClient,
      classId,
      semesterId,
      nextSemesterId
    );

    expect(subscribedSemesterRepository.updateSubscribedSemester).toHaveBeenCalledWith(
      adminClient,
      nextSubscriptionId,
      {
        amount: 750,
        status: SUBSCRIBED_SEMESTER_STATUSES.PENDING,
      }
    );
    expect(subscribedSemesterRepository.updateSubscribedSemester).toHaveBeenCalledWith(
      adminClient,
      subscriptionId,
      {
        amount: 500,
        status: SUBSCRIBED_SEMESTER_STATUSES.STOPPED,
      }
    );
  });
});
