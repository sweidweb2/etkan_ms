import { beforeEach, describe, expect, it, vi } from "vitest";
import * as paymentPhaseRepository from "@/repositories/payment-phase.repository";
import * as studentPaymentPhaseRepository from "@/repositories/student-payment-phase.repository";
import * as studentPaymentRepository from "@/repositories/student-payment.repository";
import * as studentFinancialAdjustmentRepository from "@/repositories/student-financial-adjustment.repository";
import * as auditLogService from "@/services/audit-log.service";
import type { AuditActor } from "@/services/audit-log.service";
import {
  createStudentPaymentForManager,
  deleteStudentPaymentForManager,
} from "@/services/student-payment.service";

vi.mock("@/repositories/payment-phase.repository");
vi.mock("@/repositories/student-payment-phase.repository");
vi.mock("@/repositories/student-payment.repository");
vi.mock("@/repositories/student-financial-adjustment.repository");
vi.mock("@/services/audit-log.service", () => ({
  recordManagerAuditLog: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/services/authorization.service", () => ({
  UNAUTHORIZED_MESSAGE: "Unauthorized.",
  assertPermission: vi.fn(async (_c, userId) => {
    if (!userId) throw new Error("Unauthorized.");
  }),
  getUnauthorizedError: vi.fn(async (_c, userId) =>
    userId ? null : "Unauthorized."
  ),
}));

const adminClient = {} as never;
const actor: AuditActor = {
  userId: "11111111-1111-4111-8111-111111111111",
  userLabel: "Manager",
};

const phaseId = "22222222-2222-4222-8222-222222222222";
const sppId = "33333333-3333-4333-8333-333333333333";
const paymentId = "44444444-4444-4444-8444-444444444444";

const phaseRecord = {
  id: phaseId,
  name: "Fall tuition",
  semester_id: "66666666-6666-4666-8666-666666666666",
  semester_code: "F26",
  amount: 1000,
  upfront_amount: 0,
  duration_months: 4,
  start_date: "2026-09-01",
  end_date: "2026-12-31",
  status: "opened",
  created_at: "2026-07-01T00:00:00.000Z",
  updated_at: "2026-07-01T00:00:00.000Z",
  semesters: {
    id: "66666666-6666-4666-8666-666666666666",
    name: "Fall",
    semester_code: "F26",
  },
};

const sppRecord = {
  id: sppId,
  student_id: "student-1",
  payment_phase_id: phaseId,
  assigned_at: "2026-07-01T00:00:00.000Z",
  status: "pending",
  original_amount: 1000,
  adjustment_amount: 0,
  final_amount_due: 1000,
  total_paid: 0,
  remaining_amount: 1000,
  created_at: "2026-07-01T00:00:00.000Z",
  updated_at: "2026-07-01T00:00:00.000Z",
};

const paymentRecord = {
  id: paymentId,
  student_payment_phase_id: sppId,
  payment_date: "2026-07-15",
  amount: 1000,
  payment_method: "cash",
  received_by: "Manager",
  received_by_management: true,
  receipt_number: null,
  notes: null,
  created_at: "2026-07-15T00:00:00.000Z",
  updated_at: "2026-07-15T00:00:00.000Z",
};

describe("createStudentPaymentForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("rejects payments when the phase is cancelled", async () => {
    vi.mocked(studentPaymentPhaseRepository.findSppById).mockResolvedValue({
      data: sppRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(paymentPhaseRepository.findPaymentPhaseById).mockResolvedValue({
      data: { ...phaseRecord, status: "cancelled" },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    const result = await createStudentPaymentForManager(
      adminClient,
      actor.userId,
      actor,
      {
        student_payment_phase_id: sppId,
        payment_date: "2026-07-15",
        amount: 100,
        payment_method: "cash",
        received_by: "Manager",
        received_by_management: true,
      }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/cancelled payment phase/i);
    }
    expect(studentPaymentRepository.createStudentPayment).not.toHaveBeenCalled();
  });

  it("rejects payments when the SPP is cancelled", async () => {
    vi.mocked(studentPaymentPhaseRepository.findSppById).mockResolvedValue({
      data: { ...sppRecord, status: "cancelled" },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(paymentPhaseRepository.findPaymentPhaseById).mockResolvedValue({
      data: phaseRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    const result = await createStudentPaymentForManager(
      adminClient,
      actor.userId,
      actor,
      {
        student_payment_phase_id: sppId,
        payment_date: "2026-07-15",
        amount: 100,
        payment_method: "cash",
        received_by: "Manager",
        received_by_management: true,
      }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/cancelled student assignment/i);
    }
  });

  it("marks SPP paid and can close the phase when fully paid", async () => {
    vi.mocked(studentPaymentPhaseRepository.findSppById)
      .mockResolvedValueOnce({
        data: sppRecord,
        error: null,
        count: null,
        status: 200,
        statusText: "OK",
      } as never)
      .mockResolvedValueOnce({
        data: sppRecord,
        error: null,
        count: null,
        status: 200,
        statusText: "OK",
      } as never);
    vi.mocked(paymentPhaseRepository.findPaymentPhaseById)
      .mockResolvedValueOnce({
        data: phaseRecord,
        error: null,
        count: null,
        status: 200,
        statusText: "OK",
      } as never)
      .mockResolvedValueOnce({
        data: phaseRecord,
        error: null,
        count: null,
        status: 200,
        statusText: "OK",
      } as never)
      .mockResolvedValueOnce({
        data: phaseRecord,
        error: null,
        count: null,
        status: 200,
        statusText: "OK",
      } as never);
    vi.mocked(studentPaymentRepository.createStudentPayment).mockResolvedValue({
      data: paymentRecord,
      error: null,
      count: null,
      status: 201,
      statusText: "Created",
    } as never);
    vi.mocked(
      studentPaymentRepository.listPaymentAmountsBySppIds
    ).mockResolvedValue({
      data: [{ student_payment_phase_id: sppId, amount: 1000 }],
      error: null,
    } as never);
    vi.mocked(
      studentFinancialAdjustmentRepository.listAdjustmentsBySppIds
    ).mockResolvedValue({
      data: [],
      error: null,
    } as never);
    vi.mocked(
      studentPaymentPhaseRepository.updateStudentPaymentPhaseFinancials
    ).mockResolvedValue({
      data: {
        ...sppRecord,
        status: "paid",
        total_paid: 1000,
        remaining_amount: 0,
      },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      studentPaymentPhaseRepository.listSppsByPaymentPhaseId
    ).mockResolvedValue({
      data: [{ ...sppRecord, status: "paid", total_paid: 1000, remaining_amount: 0 }],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(paymentPhaseRepository.updatePaymentPhaseStatus).mockResolvedValue({
      data: { ...phaseRecord, status: "closed" },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    const result = await createStudentPaymentForManager(
      adminClient,
      actor.userId,
      actor,
      {
        student_payment_phase_id: sppId,
        payment_date: "2026-07-15",
        amount: 1000,
        payment_method: "cash",
        received_by: "Manager",
        received_by_management: true,
      }
    );

    expect(result.success).toBe(true);
    expect(
      studentPaymentPhaseRepository.updateStudentPaymentPhaseFinancials
    ).toHaveBeenCalledWith(
      adminClient,
      sppId,
      expect.objectContaining({
        status: "paid",
        total_paid: 1000,
        remaining_amount: 0,
      })
    );
    expect(paymentPhaseRepository.updatePaymentPhaseStatus).toHaveBeenCalledWith(
      adminClient,
      phaseId,
      "closed"
    );
  });

  it("marks SPP paid with credit when overpaid", async () => {
    vi.mocked(studentPaymentPhaseRepository.findSppById)
      .mockResolvedValueOnce({
        data: sppRecord,
        error: null,
        count: null,
        status: 200,
        statusText: "OK",
      } as never)
      .mockResolvedValueOnce({
        data: sppRecord,
        error: null,
        count: null,
        status: 200,
        statusText: "OK",
      } as never);
    vi.mocked(paymentPhaseRepository.findPaymentPhaseById).mockResolvedValue({
      data: phaseRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(studentPaymentRepository.createStudentPayment).mockResolvedValue({
      data: { ...paymentRecord, amount: 1200 },
      error: null,
      count: null,
      status: 201,
      statusText: "Created",
    } as never);
    vi.mocked(
      studentPaymentRepository.listPaymentAmountsBySppIds
    ).mockResolvedValue({
      data: [{ student_payment_phase_id: sppId, amount: 1200 }],
      error: null,
    } as never);
    vi.mocked(
      studentFinancialAdjustmentRepository.listAdjustmentsBySppIds
    ).mockResolvedValue({
      data: [],
      error: null,
    } as never);
    vi.mocked(
      studentPaymentPhaseRepository.updateStudentPaymentPhaseFinancials
    ).mockResolvedValue({
      data: {
        ...sppRecord,
        status: "paid",
        total_paid: 1200,
        remaining_amount: -200,
      },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      studentPaymentPhaseRepository.listSppsByPaymentPhaseId
    ).mockResolvedValue({
      data: [
        {
          ...sppRecord,
          status: "paid",
          total_paid: 1200,
          remaining_amount: -200,
        },
      ],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(paymentPhaseRepository.updatePaymentPhaseStatus).mockResolvedValue({
      data: { ...phaseRecord, status: "closed" },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    const result = await createStudentPaymentForManager(
      adminClient,
      actor.userId,
      actor,
      {
        student_payment_phase_id: sppId,
        payment_date: "2026-07-15",
        amount: 1200,
        payment_method: "cash",
        received_by: "Manager",
        received_by_management: true,
      }
    );

    expect(result.success).toBe(true);
    expect(
      studentPaymentPhaseRepository.updateStudentPaymentPhaseFinancials
    ).toHaveBeenCalledWith(
      adminClient,
      sppId,
      expect.objectContaining({
        status: "paid",
        remaining_amount: -200,
      })
    );
  });
});

describe("deleteStudentPaymentForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("reopens a closed phase after deleting a covering payment", async () => {
    vi.mocked(studentPaymentRepository.findPaymentById).mockResolvedValue({
      data: paymentRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(studentPaymentPhaseRepository.findSppById)
      .mockResolvedValueOnce({
        data: { ...sppRecord, status: "paid", total_paid: 1000, remaining_amount: 0 },
        error: null,
        count: null,
        status: 200,
        statusText: "OK",
      } as never)
      .mockResolvedValueOnce({
        data: { ...sppRecord, status: "paid", total_paid: 1000, remaining_amount: 0 },
        error: null,
        count: null,
        status: 200,
        statusText: "OK",
      } as never);
    vi.mocked(paymentPhaseRepository.findPaymentPhaseById).mockResolvedValue({
      data: { ...phaseRecord, status: "closed" },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(studentPaymentRepository.deleteStudentPayment).mockResolvedValue({
      data: null,
      error: null,
      count: null,
      status: 204,
      statusText: "No Content",
    } as never);
    vi.mocked(
      studentPaymentRepository.listPaymentAmountsBySppIds
    ).mockResolvedValue({
      data: [],
      error: null,
    } as never);
    vi.mocked(
      studentFinancialAdjustmentRepository.listAdjustmentsBySppIds
    ).mockResolvedValue({
      data: [],
      error: null,
    } as never);
    vi.mocked(
      studentPaymentPhaseRepository.updateStudentPaymentPhaseFinancials
    ).mockResolvedValue({
      data: {
        ...sppRecord,
        status: "pending",
        total_paid: 0,
        remaining_amount: 1000,
      },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      studentPaymentPhaseRepository.listSppsByPaymentPhaseId
    ).mockResolvedValue({
      data: [
        {
          ...sppRecord,
          status: "pending",
          total_paid: 0,
          remaining_amount: 1000,
        },
      ],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(paymentPhaseRepository.updatePaymentPhaseStatus).mockResolvedValue({
      data: { ...phaseRecord, status: "opened" },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    const result = await deleteStudentPaymentForManager(
      adminClient,
      actor.userId,
      actor,
      { id: paymentId, student_payment_phase_id: sppId }
    );

    expect(result.success).toBe(true);
    expect(paymentPhaseRepository.updatePaymentPhaseStatus).toHaveBeenCalledWith(
      adminClient,
      phaseId,
      "opened"
    );
  });
});
