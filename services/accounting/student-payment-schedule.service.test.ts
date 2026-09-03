import { beforeEach, describe, expect, it, vi } from "vitest";
import * as studentPaymentPhaseRepository from "@/repositories/student-payment-phase.repository";
import * as studentPaymentScheduleRepository from "@/repositories/student-payment-schedule.repository";
import { listStudentPaymentSchedulesForSelf } from "@/services/accounting/student-payment-schedule.service";
import {
  assertPermission,
  assertStudentSelfAccess,
} from "@/services/auth/authorization.service";

vi.mock("@/repositories/student-payment-phase.repository");
vi.mock("@/repositories/student-payment-schedule.repository");
vi.mock("@/services/ops/audit-log.service", () => ({
  recordManagerAuditLog: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/services/auth/authorization.service", () => ({
  UNAUTHORIZED_MESSAGE: "Unauthorized.",
  assertPermission: vi.fn(async (_c, userId) => {
    if (!userId) throw new Error("Unauthorized.");
  }),
  assertStudentSelfAccess: vi.fn(async (_c, userId) => {
    if (!userId) throw new Error("Unauthorized.");
    return userId;
  }),
  getUnauthorizedError: vi.fn(async (_c, userId) =>
    userId ? null : "Unauthorized."
  ),
}));

const adminClient = {} as never;
const studentUserId = "student-1";
const sppId = "33333333-3333-4333-8333-333333333333";

describe("listStudentPaymentSchedulesForSelf", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(assertPermission).mockImplementation(async (_c, userId) => {
      if (!userId) throw new Error("Unauthorized.");
    });
    vi.mocked(assertStudentSelfAccess).mockImplementation(async (_c, userId) => {
      if (!userId) throw new Error("Unauthorized.");
      return userId as string;
    });
  });

  it("lists schedules for owned SPP", async () => {
    vi.mocked(studentPaymentPhaseRepository.findSppById).mockResolvedValue({
      data: {
        id: sppId,
        student_id: studentUserId,
        payment_phase_id: "phase-1",
        assigned_at: "2026-07-01T00:00:00.000Z",
        status: "pending",
        original_amount: 1000,
        adjustment_amount: 0,
        final_amount_due: 1000,
        total_paid: 0,
        remaining_amount: 1000,
        created_at: "2026-07-01T00:00:00.000Z",
        updated_at: "2026-07-01T00:00:00.000Z",
      },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      studentPaymentScheduleRepository.listSchedulesBySppId
    ).mockResolvedValue({
      data: [
        {
          id: "sched-1",
          student_payment_phase_id: sppId,
          due_date: "2026-08-01",
          amount: 500,
          label: "Installment 1",
          status: "planned",
          notes: null,
          created_at: "2026-07-01T00:00:00.000Z",
          updated_at: "2026-07-01T00:00:00.000Z",
        },
      ],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    const rows = await listStudentPaymentSchedulesForSelf(
      adminClient,
      studentUserId,
      sppId
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.label).toBe("Installment 1");
  });

  it("returns empty list for another student's SPP", async () => {
    vi.mocked(studentPaymentPhaseRepository.findSppById).mockResolvedValue({
      data: {
        id: sppId,
        student_id: "other-student",
        payment_phase_id: "phase-1",
        assigned_at: "2026-07-01T00:00:00.000Z",
        status: "pending",
        original_amount: 1000,
        adjustment_amount: 0,
        final_amount_due: 1000,
        total_paid: 0,
        remaining_amount: 1000,
        created_at: "2026-07-01T00:00:00.000Z",
        updated_at: "2026-07-01T00:00:00.000Z",
      },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    const rows = await listStudentPaymentSchedulesForSelf(
      adminClient,
      studentUserId,
      sppId
    );

    expect(rows).toEqual([]);
    expect(
      studentPaymentScheduleRepository.listSchedulesBySppId
    ).not.toHaveBeenCalled();
  });
});
