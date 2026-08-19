import { beforeEach, describe, expect, it, vi } from "vitest";
import { CLASS_STATUSES } from "@/lib/constants/manager-class-status";
import { STUDENT_STATUSES } from "@/lib/constants/manager-student-status";
import { PAYMENT_PHASE_STATUSES } from "@/lib/manager/accounting/constants";
import * as studentClassRepository from "@/repositories/student-class.repository";
import * as studentPaymentPhaseRepository from "@/repositories/student-payment-phase.repository";
import * as studentPaymentRepository from "@/repositories/student-payment.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import * as auditLogService from "@/services/ops/audit-log.service";
import type { AuditActor } from "@/services/ops/audit-log.service";
import {
  changeStudentStatusForManager,
  getStudentStatusSideEffectsPreview,
} from "@/services/students/student-status.service";

vi.mock("@/repositories/student-class.repository");
vi.mock("@/repositories/student-payment-phase.repository");
vi.mock("@/repositories/student-payment.repository");
vi.mock("@/repositories/student-profile.repository");
vi.mock("@/services/ops/audit-log.service", () => ({
  recordManagerAuditLog: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/services/auth/authorization.service", () => ({
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
const studentUserId = "22222222-2222-4222-8222-222222222222";
const studentProfileId = "33333333-3333-4333-8333-333333333333";
const studentClassId = "44444444-4444-4444-8444-444444444444";
const classId = "55555555-5555-4555-8555-555555555555";
const sppId = "66666666-6666-4666-8666-666666666666";
const phaseId = "77777777-7777-4777-8777-777777777777";

const activeProfile = {
  id: studentProfileId,
  user_id: studentUserId,
  full_name: "Jane Doe",
  birth_date: null,
  phone: null,
  status: STUDENT_STATUSES.ACTIVE,
  created_at: "2026-01-01T00:00:00.000Z",
};

describe("getStudentStatusSideEffectsPreview", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("returns eligible classes and blocks SPP delete when payments exist", async () => {
    vi.mocked(
      studentProfileRepository.findStudentProfileByUserId
    ).mockResolvedValue({
      data: activeProfile,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(
      studentClassRepository.listStudentClassesWithClassByUserId
    ).mockResolvedValue({
      data: [
        {
          id: studentClassId,
          user_id: studentUserId,
          class_id: classId,
          joined_at: "2026-01-02T00:00:00.000Z",
          classes: {
            id: classId,
            name: "Math A",
            status: CLASS_STATUSES.IN_PROGRESS,
          },
        },
      ],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      studentPaymentPhaseRepository.listSppsWithPhaseByStudentId
    ).mockResolvedValue({
      data: [
        {
          id: sppId,
          student_id: studentUserId,
          payment_phase_id: phaseId,
          assigned_at: "2026-01-02T00:00:00.000Z",
          status: "pending",
          original_amount: 100,
          adjustment_amount: 0,
          final_amount_due: 100,
          total_paid: 20,
          remaining_amount: 80,
          created_at: "2026-01-02T00:00:00.000Z",
          updated_at: "2026-01-02T00:00:00.000Z",
          payment_phases: {
            id: phaseId,
            name: "Phase 1",
            status: PAYMENT_PHASE_STATUSES.OPENED,
          },
        },
      ],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      studentPaymentRepository.listPaymentSppIdsBySppIds
    ).mockResolvedValue({
      data: [{ student_payment_phase_id: sppId }],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    const preview = await getStudentStatusSideEffectsPreview(
      adminClient,
      actor.userId,
      studentUserId
    );

    expect(preview.eligible_classes).toHaveLength(1);
    expect(preview.open_spps[0]?.payment_count).toBe(1);
    expect(preview.can_remove_open_spps).toBe(false);
    expect(preview.open_spps_blocked_reason).toMatch(/payments/i);
  });
});

describe("changeStudentStatusForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("activates without side effects", async () => {
    vi.mocked(
      studentProfileRepository.changeStudentStatusWithSideEffects
    ).mockResolvedValue({
      data: {
        profileId: studentProfileId,
        previousStatus: STUDENT_STATUSES.INACTIVE,
        status: STUDENT_STATUSES.ACTIVE,
        removedClasses: [],
        retainedSpps: [],
        deletedSpps: [],
      },
      error: null,
    } as never);

    const result = await changeStudentStatusForManager(
      adminClient,
      actor.userId,
      actor,
      {
        user_id: studentUserId,
        target_status: STUDENT_STATUSES.ACTIVE,
        remove_from_classes: false,
        remove_open_spps: false,
      }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.status).toBe(STUDENT_STATUSES.ACTIVE);
    }
    expect(
      studentProfileRepository.changeStudentStatusWithSideEffects
    ).toHaveBeenCalledWith(
      adminClient,
      expect.objectContaining({
        user_id: studentUserId,
        target_status: STUDENT_STATUSES.ACTIVE,
        remove_from_classes: false,
        remove_open_spps: false,
      })
    );
    expect(
      studentClassRepository.deleteStudentClassById
    ).not.toHaveBeenCalled();
    expect(auditLogService.recordManagerAuditLog).toHaveBeenCalled();
  });

  it("rejects self status change", async () => {
    const result = await changeStudentStatusForManager(
      adminClient,
      studentUserId,
      { userId: studentUserId, userLabel: "Self" },
      {
        user_id: studentUserId,
        target_status: STUDENT_STATUSES.INACTIVE,
        remove_from_classes: false,
        remove_open_spps: false,
      }
    );
    expect(result.success).toBe(false);
    expect(
      studentProfileRepository.changeStudentStatusWithSideEffects
    ).not.toHaveBeenCalled();
  });

  it("inactivates and removes eligible class membership", async () => {
    vi.mocked(
      studentProfileRepository.changeStudentStatusWithSideEffects
    ).mockResolvedValue({
      data: {
        profileId: studentProfileId,
        previousStatus: STUDENT_STATUSES.ACTIVE,
        status: STUDENT_STATUSES.INACTIVE,
        removedClasses: [
          {
            studentClassId,
            classId,
            className: "Math A",
          },
        ],
        retainedSpps: [],
        deletedSpps: [],
      },
      error: null,
    } as never);

    const result = await changeStudentStatusForManager(
      adminClient,
      actor.userId,
      actor,
      {
        user_id: studentUserId,
        target_status: STUDENT_STATUSES.INACTIVE,
        remove_from_classes: true,
        remove_open_spps: false,
      }
    );

    expect(result.success).toBe(true);
    expect(
      studentProfileRepository.changeStudentStatusWithSideEffects
    ).toHaveBeenCalledWith(
      adminClient,
      expect.objectContaining({
        remove_from_classes: true,
        remove_open_spps: false,
      })
    );
    expect(
      studentClassRepository.deleteStudentClassById
    ).not.toHaveBeenCalled();
    expect(auditLogService.recordManagerAuditLog).toHaveBeenCalled();
  });

  it("rejects open SPP delete when payments exist", async () => {
    vi.mocked(
      studentProfileRepository.changeStudentStatusWithSideEffects
    ).mockResolvedValue({
      data: null,
      error: {
        message:
          "One or more open SPPs have payments. Delete payments from Accounting first.",
      },
    } as never);

    const result = await changeStudentStatusForManager(
      adminClient,
      actor.userId,
      actor,
      {
        user_id: studentUserId,
        target_status: STUDENT_STATUSES.INACTIVE,
        remove_from_classes: false,
        remove_open_spps: true,
      }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.remove_open_spps?.[0]).toMatch(/payments/i);
    }
    expect(
      studentPaymentPhaseRepository.deleteStudentPaymentPhaseById
    ).not.toHaveBeenCalled();
    expect(auditLogService.recordManagerAuditLog).not.toHaveBeenCalled();
  });

  it("deletes payment-free open SPPs then inactivates", async () => {
    vi.mocked(
      studentProfileRepository.changeStudentStatusWithSideEffects
    ).mockResolvedValue({
      data: {
        profileId: studentProfileId,
        previousStatus: STUDENT_STATUSES.ACTIVE,
        status: STUDENT_STATUSES.INACTIVE,
        removedClasses: [],
        retainedSpps: [],
        deletedSpps: [
          {
            sppId,
            paymentPhaseId: phaseId,
            paymentPhaseName: "Phase 1",
            sppStatus: "pending",
          },
        ],
      },
      error: null,
    } as never);

    const result = await changeStudentStatusForManager(
      adminClient,
      actor.userId,
      actor,
      {
        user_id: studentUserId,
        target_status: STUDENT_STATUSES.INACTIVE,
        remove_from_classes: false,
        remove_open_spps: true,
      }
    );

    expect(result.success).toBe(true);
    expect(
      studentPaymentPhaseRepository.deleteStudentPaymentPhaseById
    ).not.toHaveBeenCalled();
    expect(auditLogService.recordManagerAuditLog).toHaveBeenCalledWith(
      adminClient,
      actor,
      expect.objectContaining({
        action: "delete",
        table_name: "student_payment_phases",
        record_id: sppId,
      })
    );
  });
});
