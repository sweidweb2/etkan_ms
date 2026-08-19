import { beforeEach, describe, expect, it, vi } from "vitest";
import * as paymentPhaseRepository from "@/repositories/payment-phase.repository";
import * as studentPaymentPhaseRepository from "@/repositories/student-payment-phase.repository";
import * as auditLogService from "@/services/ops/audit-log.service";
import type { AuditActor } from "@/services/ops/audit-log.service";
import {
  backfillSppsForClassBecomeInProgress,
  ensureSppForStudentOnPhase,
  findSyncTargetPhaseForClass,
  onStudentJoinedClass,
  onStudentLeftClass,
  onStudentsJoinedClass,
} from "@/services/accounting/accounting-sync.service";

vi.mock("@/repositories/payment-phase.repository");
vi.mock("@/repositories/student-payment-phase.repository");
vi.mock("@/services/ops/audit-log.service", () => ({
  recordManagerAuditLog: vi.fn().mockResolvedValue(null),
}));

const adminClient = {} as never;
const actor: AuditActor = {
  userId: "11111111-1111-4111-8111-111111111111",
  userLabel: "Manager",
};

const semesterId = "99999999-9999-4999-8999-999999999999";
const classId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const otherClassId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab";
const phaseId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const studentId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const sppId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const otherSppId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

const openedPhase = {
  id: phaseId,
  name: "Fall tuition",
  semester_id: semesterId,
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

describe("findSyncTargetPhaseForClass", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns the RPC phase", async () => {
    vi.mocked(
      paymentPhaseRepository.findSyncTargetPhaseForClass
    ).mockResolvedValue({
      data: openedPhase,
      error: null,
    } as never);

    const phase = await findSyncTargetPhaseForClass(adminClient, classId);

    expect(phase?.id).toBe(phaseId);
    expect(
      paymentPhaseRepository.findSyncTargetPhaseForClass
    ).toHaveBeenCalledWith(adminClient, classId);
  });
});

describe("ensureSppForStudentOnPhase", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("is idempotent when an SPP already exists", async () => {
    vi.mocked(
      studentPaymentPhaseRepository.ensureSppForStudentOnPhase
    ).mockResolvedValue({
      data: {
        spp: pendingSpp,
        created: false,
        alreadyExisted: true,
        reactivated: false,
      },
      error: null,
    } as never);

    const result = await ensureSppForStudentOnPhase(adminClient, {
      studentId,
      phase: openedPhase,
    });

    expect(result.created).toBe(false);
    expect(result.alreadyExisted).toBe(true);
    expect(result.reactivated).toBe(false);
    expect(
      studentPaymentPhaseRepository.ensureSppForStudentOnPhase
    ).toHaveBeenCalledWith(adminClient, studentId, phaseId, undefined);
    expect(
      studentPaymentPhaseRepository.createStudentPaymentPhase
    ).not.toHaveBeenCalled();
  });

  it("reactivates a cancelled SPP without inserting a new row", async () => {
    const reactivatedSpp = { ...pendingSpp, status: "pending" };

    vi.mocked(
      studentPaymentPhaseRepository.ensureSppForStudentOnPhase
    ).mockResolvedValue({
      data: {
        spp: reactivatedSpp,
        created: false,
        alreadyExisted: true,
        reactivated: true,
      },
      error: null,
    } as never);

    const result = await ensureSppForStudentOnPhase(adminClient, {
      studentId,
      phase: openedPhase,
    });

    expect(result.created).toBe(false);
    expect(result.reactivated).toBe(true);
    expect(result.spp?.status).toBe("pending");
    expect(
      studentPaymentPhaseRepository.createStudentPaymentPhase
    ).not.toHaveBeenCalled();
    expect(
      studentPaymentPhaseRepository.updateStudentPaymentPhaseStatus
    ).not.toHaveBeenCalled();
  });
});

describe("backfillSppsForClassBecomeInProgress", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("audits created and reactivated SPPs from one RPC", async () => {
    const reactivatedSpp = {
      ...pendingSpp,
      id: otherSppId,
      status: "pending",
    };
    vi.mocked(
      studentPaymentPhaseRepository.backfillSppsForClassBecomeInProgress
    ).mockResolvedValue({
      data: {
        ensuredCount: 2,
        createdCount: 1,
        reactivatedCount: 1,
        created: [pendingSpp],
        reactivated: [reactivatedSpp],
        semesterId,
      },
      error: null,
    } as never);

    const result = await backfillSppsForClassBecomeInProgress(
      adminClient,
      classId,
      actor
    );

    expect(result).toEqual({
      ensuredCount: 2,
      createdCount: 1,
      reactivatedCount: 1,
    });
    expect(
      studentPaymentPhaseRepository.backfillSppsForClassBecomeInProgress
    ).toHaveBeenCalledWith(adminClient, classId);
    expect(
      studentPaymentPhaseRepository.ensureSppForStudentOnPhase
    ).not.toHaveBeenCalled();
    expect(auditLogService.recordManagerAuditLog).toHaveBeenCalledTimes(1);
    expect(auditLogService.recordManagerAuditLog).toHaveBeenCalledWith(
      adminClient,
      actor,
      expect.objectContaining({
        action: "insert",
        table_name: "student_payment_phases",
        record_id: classId,
        metadata: expect.objectContaining({
          note: "Student payment phases backfilled for class in_progress.",
          class_id: classId,
          semester_id: semesterId,
          created_count: 1,
          reactivated_count: 1,
          created: expect.arrayContaining([
            expect.objectContaining({
              spp_id: sppId,
              student_id: studentId,
            }),
          ]),
          reactivated: expect.arrayContaining([
            expect.objectContaining({
              spp_id: otherSppId,
            }),
          ]),
        }),
      })
    );
  });

  it("skips audits when the RPC created nothing", async () => {
    vi.mocked(
      studentPaymentPhaseRepository.backfillSppsForClassBecomeInProgress
    ).mockResolvedValue({
      data: {
        ensuredCount: 0,
        createdCount: 0,
        reactivatedCount: 0,
        created: [],
        reactivated: [],
        semesterId: null,
      },
      error: null,
    } as never);

    const result = await backfillSppsForClassBecomeInProgress(
      adminClient,
      classId,
      actor
    );

    expect(result).toEqual({
      ensuredCount: 0,
      createdCount: 0,
      reactivatedCount: 0,
    });
    expect(auditLogService.recordManagerAuditLog).not.toHaveBeenCalled();
  });
});

describe("onStudentJoinedClass", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  function mockJoinRpc(payload: {
    phase?: typeof openedPhase | typeof closedPhase | null;
    spp?: typeof pendingSpp | null;
    created?: boolean;
    reactivated?: boolean;
    phaseReopened?: boolean;
  }) {
    vi.mocked(
      studentPaymentPhaseRepository.syncStudentJoinedClass
    ).mockResolvedValue({
      data: {
        phase: payload.phase === undefined ? openedPhase : payload.phase,
        spp: payload.spp === undefined ? pendingSpp : payload.spp,
        created: payload.created ?? false,
        reactivated: payload.reactivated ?? false,
        phaseReopened: payload.phaseReopened ?? false,
      },
      error: null,
    } as never);
  }

  it("creates an SPP when joining the semester's in-progress class", async () => {
    mockJoinRpc({ created: true });

    const result = await onStudentJoinedClass(
      adminClient,
      { studentId, classId },
      actor
    );

    expect(result.created).toBe(true);
    expect(result.reactivated).toBe(false);
    expect(result.spp?.status).toBe("pending");
    expect(result.phaseReopened).toBe(false);
    expect(
      studentPaymentPhaseRepository.syncStudentJoinedClass
    ).toHaveBeenCalledWith(adminClient, studentId, classId);
    expect(auditLogService.recordManagerAuditLog).toHaveBeenCalledWith(
      adminClient,
      actor,
      expect.objectContaining({
        action: "insert",
        table_name: "student_payment_phases",
      })
    );
  });

  it("reactivates a cancelled SPP on join and can reopen a closed phase", async () => {
    mockJoinRpc({
      phase: { ...closedPhase, status: "opened" },
      spp: { ...pendingSpp, status: "pending" },
      reactivated: true,
      phaseReopened: true,
    });

    const result = await onStudentJoinedClass(
      adminClient,
      { studentId, classId },
      actor
    );

    expect(result.created).toBe(false);
    expect(result.reactivated).toBe(true);
    expect(result.phaseReopened).toBe(true);
    expect(
      studentPaymentPhaseRepository.createStudentPaymentPhase
    ).not.toHaveBeenCalled();
  });

  it("no-ops when joining a non-in-progress class", async () => {
    mockJoinRpc({ phase: null, spp: null });

    const result = await onStudentJoinedClass(
      adminClient,
      { studentId, classId: otherClassId },
      actor
    );

    expect(result.created).toBe(false);
    expect(result.spp).toBeNull();
    expect(auditLogService.recordManagerAuditLog).not.toHaveBeenCalled();
  });

  it("no-ops when no in-progress class exists for the semester", async () => {
    mockJoinRpc({ phase: null, spp: null });

    const result = await onStudentJoinedClass(
      adminClient,
      { studentId, classId },
      actor
    );

    expect(result.created).toBe(false);
    expect(result.spp).toBeNull();
  });

  it("creates an SPP and reopens a closed phase", async () => {
    mockJoinRpc({
      phase: { ...closedPhase, status: "opened" },
      created: true,
      phaseReopened: true,
    });

    const result = await onStudentJoinedClass(
      adminClient,
      { studentId, classId },
      actor
    );

    expect(result.created).toBe(true);
    expect(result.phaseReopened).toBe(true);
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
    mockJoinRpc({ phase: null, spp: null });

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

  it("reuses an existing unpaid SPP on join and reopens a closed phase", async () => {
    mockJoinRpc({
      phase: { ...closedPhase, status: "opened" },
      spp: pendingSpp,
      phaseReopened: true,
    });

    const result = await onStudentJoinedClass(
      adminClient,
      { studentId, classId },
      actor
    );

    expect(result.created).toBe(false);
    expect(result.reactivated).toBe(false);
    expect(result.spp?.id).toBe(sppId);
    expect(result.phaseReopened).toBe(true);
    expect(
      studentPaymentPhaseRepository.createStudentPaymentPhase
    ).not.toHaveBeenCalled();
  });
});

describe("onStudentsJoinedClass", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("audits successful joins from the batch RPC", async () => {
    const otherStudentId = "f1f1f1f1-f1f1-4f1f-8f1f-f1f1f1f1f1f1";
    vi.mocked(
      studentPaymentPhaseRepository.syncStudentsJoinedClass
    ).mockResolvedValue({
      data: [
        {
          studentId,
          ok: true,
          phase: openedPhase,
          spp: pendingSpp,
          created: true,
          reactivated: false,
          phaseReopened: false,
        },
        {
          studentId: otherStudentId,
          ok: false,
          error: "phase missing",
        },
      ],
      error: null,
    } as never);

    const items = await onStudentsJoinedClass(
      adminClient,
      { classId, studentIds: [studentId, otherStudentId] },
      actor
    );

    expect(items).toHaveLength(2);
    expect(items[0]?.ok).toBe(true);
    expect(items[0]?.created).toBe(true);
    expect(items[1]?.ok).toBe(false);
    expect(
      studentPaymentPhaseRepository.syncStudentsJoinedClass
    ).toHaveBeenCalledWith(adminClient, classId, [studentId, otherStudentId]);
    expect(auditLogService.recordManagerAuditLog).toHaveBeenCalledTimes(1);
    expect(auditLogService.recordManagerAuditLog).toHaveBeenCalledWith(
      adminClient,
      actor,
      expect.objectContaining({
        action: "insert",
        table_name: "student_payment_phases",
        record_id: classId,
        metadata: expect.objectContaining({
          note: "Student payment phases synced from batch class enrollment.",
          class_id: classId,
          created_count: 1,
        }),
      })
    );
  });
});

describe("onStudentLeftClass (Phase E7 leave / phase close)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  function mockLeaveRpc(payload: {
    phase?: typeof openedPhase | typeof closedPhase | null;
    spp?: typeof pendingSpp | (typeof pendingSpp & { status: string }) | null;
    retained?: boolean;
  }) {
    vi.mocked(
      studentPaymentPhaseRepository.syncStudentLeftClass
    ).mockResolvedValue({
      data: {
        phase: payload.phase === undefined ? openedPhase : payload.phase,
        spp: payload.spp === undefined ? pendingSpp : payload.spp,
        retained: payload.retained ?? false,
      },
      error: null,
    } as never);
  }

  it("retains unpaid SPP while siblings are paid and keeps the phase opened (E7)", async () => {
    mockLeaveRpc({ retained: true });

    const result = await onStudentLeftClass(
      adminClient,
      { studentId, classId },
      actor
    );

    expect(result.retained).toBe(true);
    expect(result.spp?.id).toBe(sppId);
    expect(result.spp?.status).toBe("pending");
    expect(
      studentPaymentPhaseRepository.syncStudentLeftClass
    ).toHaveBeenCalledWith(adminClient, studentId, classId);
    expect(
      studentPaymentPhaseRepository.updateStudentPaymentPhaseStatus
    ).not.toHaveBeenCalled();
    expect(
      paymentPhaseRepository.updatePaymentPhaseStatus
    ).not.toHaveBeenCalled();
    expect(auditLogService.recordManagerAuditLog).toHaveBeenCalledWith(
      adminClient,
      actor,
      expect.objectContaining({
        action: "update",
        table_name: "student_payment_phases",
        severity: "info",
        metadata: expect.objectContaining({
          note: "Student left class; SPP retained.",
          spp_id: sppId,
        }),
      })
    );
  });

  it("retains a paid SPP and can close the phase when every active SPP is paid (E7)", async () => {
    const paidLeavingSpp = { ...pendingSpp, status: "paid", remaining_amount: 0 };
    mockLeaveRpc({
      phase: closedPhase,
      spp: paidLeavingSpp,
      retained: true,
    });

    const result = await onStudentLeftClass(
      adminClient,
      { studentId, classId },
      actor
    );

    expect(result.retained).toBe(true);
    expect(result.spp?.status).toBe("paid");
    expect(result.phase?.status).toBe("closed");
    expect(
      studentPaymentPhaseRepository.updateStudentPaymentPhaseStatus
    ).not.toHaveBeenCalled();
    expect(
      paymentPhaseRepository.updatePaymentPhaseStatus
    ).not.toHaveBeenCalled();
    expect(
      studentPaymentPhaseRepository.syncStudentLeftClass
    ).toHaveBeenCalledWith(adminClient, studentId, classId);
  });

  it("no-ops leave sync for a non-in-progress class", async () => {
    mockLeaveRpc({ phase: null, spp: null, retained: false });

    const result = await onStudentLeftClass(
      adminClient,
      { studentId, classId: otherClassId },
      actor
    );

    expect(result.retained).toBe(false);
    expect(
      studentPaymentPhaseRepository.updateStudentPaymentPhaseStatus
    ).not.toHaveBeenCalled();
    expect(auditLogService.recordManagerAuditLog).not.toHaveBeenCalled();
  });

  it("does not treat an already-cancelled SPP as retained", async () => {
    mockLeaveRpc({
      spp: { ...pendingSpp, status: "cancelled" },
      retained: false,
    });

    const result = await onStudentLeftClass(
      adminClient,
      { studentId, classId },
      actor
    );

    expect(result.retained).toBe(false);
    expect(
      studentPaymentPhaseRepository.updateStudentPaymentPhaseStatus
    ).not.toHaveBeenCalled();
    expect(auditLogService.recordManagerAuditLog).not.toHaveBeenCalled();
  });
});
