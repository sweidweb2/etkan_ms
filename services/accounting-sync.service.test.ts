import { beforeEach, describe, expect, it, vi } from "vitest";
import * as paymentPhaseRepository from "@/repositories/payment-phase.repository";
import * as studentPaymentPhaseRepository from "@/repositories/student-payment-phase.repository";
import * as auditLogService from "@/services/audit-log.service";
import type { AuditActor } from "@/services/audit-log.service";
import {
  ensureSppForStudentOnPhase,
  onStudentJoinedClass,
  onStudentLeftClass,
} from "@/services/accounting-sync.service";

vi.mock("@/repositories/payment-phase.repository");
vi.mock("@/repositories/student-payment-phase.repository");
vi.mock("@/services/audit-log.service", () => ({
  recordManagerAuditLog: vi.fn().mockResolvedValue(null),
}));

const adminClient = {} as never;
const actor: AuditActor = {
  userId: "11111111-1111-4111-8111-111111111111",
  userLabel: "Manager",
};

const classId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const phaseId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const studentId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const sppId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const otherSppId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

const openedPhase = {
  id: phaseId,
  name: "Fall tuition",
  class_id: classId,
  semester_code: "F26",
  amount: 1000,
  upfront_amount: 0,
  duration_months: 4,
  start_date: "2026-09-01",
  end_date: "2026-12-31",
  status: "opened",
  created_at: "2026-07-01T00:00:00.000Z",
  updated_at: "2026-07-01T00:00:00.000Z",
};

const closedPhase = { ...openedPhase, status: "closed" };

const pendingSpp = {
  id: sppId,
  student_id: studentId,
  payment_phase_id: phaseId,
  assigned_at: "2026-07-15T00:00:00.000Z",
  status: "pending",
  original_amount: 1000,
  adjustment_amount: 0,
  final_amount_due: 1000,
  total_paid: 0,
  remaining_amount: 1000,
  created_at: "2026-07-15T00:00:00.000Z",
  updated_at: "2026-07-15T00:00:00.000Z",
};

const paidOtherSpp = {
  ...pendingSpp,
  id: otherSppId,
  student_id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
  status: "paid",
  total_paid: 1000,
  remaining_amount: 0,
};

describe("ensureSppForStudentOnPhase", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("is idempotent when an SPP already exists", async () => {
    vi.mocked(
      studentPaymentPhaseRepository.findSppByStudentAndPhase
    ).mockResolvedValue({
      data: pendingSpp,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    const result = await ensureSppForStudentOnPhase(adminClient, {
      studentId,
      phase: openedPhase,
    });

    expect(result.created).toBe(false);
    expect(result.alreadyExisted).toBe(true);
    expect(
      studentPaymentPhaseRepository.createStudentPaymentPhase
    ).not.toHaveBeenCalled();
  });
});

describe("onStudentJoinedClass", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("creates an SPP when the class phase is opened", async () => {
    vi.mocked(
      paymentPhaseRepository.findCurrentSyncPhaseByClassId
    ).mockResolvedValue({
      data: openedPhase,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      studentPaymentPhaseRepository.findSppByStudentAndPhase
    ).mockResolvedValue({
      data: null,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      studentPaymentPhaseRepository.createStudentPaymentPhase
    ).mockResolvedValue({
      data: pendingSpp,
      error: null,
      count: null,
      status: 201,
      statusText: "Created",
    } as never);
    vi.mocked(paymentPhaseRepository.findPaymentPhaseById).mockResolvedValue({
      data: openedPhase,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      studentPaymentPhaseRepository.listSppsByPaymentPhaseId
    ).mockResolvedValue({
      data: [pendingSpp],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    const result = await onStudentJoinedClass(
      adminClient,
      { studentId, classId },
      actor
    );

    expect(result.created).toBe(true);
    expect(result.spp?.status).toBe("pending");
    expect(result.phaseReopened).toBe(false);
    expect(auditLogService.recordManagerAuditLog).toHaveBeenCalledWith(
      adminClient,
      actor,
      expect.objectContaining({
        action: "insert",
        table_name: "student_payment_phases",
      })
    );
  });

  it("creates an SPP and reopens a closed phase", async () => {
    vi.mocked(
      paymentPhaseRepository.findCurrentSyncPhaseByClassId
    ).mockResolvedValue({
      data: closedPhase,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      studentPaymentPhaseRepository.findSppByStudentAndPhase
    ).mockResolvedValue({
      data: null,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      studentPaymentPhaseRepository.createStudentPaymentPhase
    ).mockResolvedValue({
      data: pendingSpp,
      error: null,
      count: null,
      status: 201,
      statusText: "Created",
    } as never);
    vi.mocked(paymentPhaseRepository.updatePaymentPhaseStatus).mockResolvedValue(
      {
        data: { ...closedPhase, status: "opened" },
        error: null,
        count: null,
        status: 200,
        statusText: "OK",
      } as never
    );
    vi.mocked(paymentPhaseRepository.findPaymentPhaseById).mockResolvedValue({
      data: { ...closedPhase, status: "opened" },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      studentPaymentPhaseRepository.listSppsByPaymentPhaseId
    ).mockResolvedValue({
      data: [pendingSpp, paidOtherSpp],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    const result = await onStudentJoinedClass(
      adminClient,
      { studentId, classId },
      actor
    );

    expect(result.created).toBe(true);
    expect(result.phaseReopened).toBe(true);
    expect(paymentPhaseRepository.updatePaymentPhaseStatus).toHaveBeenCalledWith(
      adminClient,
      phaseId,
      "opened"
    );
    expect(auditLogService.recordManagerAuditLog).toHaveBeenCalledWith(
      adminClient,
      actor,
      expect.objectContaining({
        table_name: "payment_phases",
        action: "update",
      })
    );
  });

  it("does not create an SPP when only a cancelled phase exists", async () => {
    vi.mocked(
      paymentPhaseRepository.findCurrentSyncPhaseByClassId
    ).mockResolvedValue({
      data: null,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    const result = await onStudentJoinedClass(
      adminClient,
      { studentId, classId },
      actor
    );

    expect(result.created).toBe(false);
    expect(result.spp).toBeNull();
    expect(
      studentPaymentPhaseRepository.createStudentPaymentPhase
    ).not.toHaveBeenCalled();
  });
});

describe("onStudentLeftClass", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("cancels the SPP and closes the phase when remaining active SPPs are paid", async () => {
    vi.mocked(
      paymentPhaseRepository.findCurrentSyncPhaseByClassId
    ).mockResolvedValue({
      data: openedPhase,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      studentPaymentPhaseRepository.findSppByStudentAndPhase
    ).mockResolvedValue({
      data: pendingSpp,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      studentPaymentPhaseRepository.updateStudentPaymentPhaseStatus
    ).mockResolvedValue({
      data: { ...pendingSpp, status: "cancelled" },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(paymentPhaseRepository.findPaymentPhaseById).mockResolvedValue({
      data: openedPhase,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      studentPaymentPhaseRepository.listSppsByPaymentPhaseId
    ).mockResolvedValue({
      data: [
        { ...pendingSpp, status: "cancelled" },
        paidOtherSpp,
      ],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(paymentPhaseRepository.updatePaymentPhaseStatus).mockResolvedValue(
      {
        data: { ...openedPhase, status: "closed" },
        error: null,
        count: null,
        status: 200,
        statusText: "OK",
      } as never
    );

    const result = await onStudentLeftClass(
      adminClient,
      { studentId, classId },
      actor
    );

    expect(result.cancelled).toBe(true);
    expect(paymentPhaseRepository.updatePaymentPhaseStatus).toHaveBeenCalledWith(
      adminClient,
      phaseId,
      "closed"
    );
    expect(auditLogService.recordManagerAuditLog).toHaveBeenCalledWith(
      adminClient,
      actor,
      expect.objectContaining({
        action: "update",
        table_name: "student_payment_phases",
        severity: "warning",
      })
    );
  });

  it("keeps the phase opened when all active SPPs are cancelled", async () => {
    vi.mocked(
      paymentPhaseRepository.findCurrentSyncPhaseByClassId
    ).mockResolvedValue({
      data: openedPhase,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      studentPaymentPhaseRepository.findSppByStudentAndPhase
    ).mockResolvedValue({
      data: pendingSpp,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      studentPaymentPhaseRepository.updateStudentPaymentPhaseStatus
    ).mockResolvedValue({
      data: { ...pendingSpp, status: "cancelled" },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(paymentPhaseRepository.findPaymentPhaseById).mockResolvedValue({
      data: openedPhase,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      studentPaymentPhaseRepository.listSppsByPaymentPhaseId
    ).mockResolvedValue({
      data: [{ ...pendingSpp, status: "cancelled" }],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    const result = await onStudentLeftClass(
      adminClient,
      { studentId, classId },
      actor
    );

    expect(result.cancelled).toBe(true);
    expect(
      paymentPhaseRepository.updatePaymentPhaseStatus
    ).not.toHaveBeenCalled();
  });
});
