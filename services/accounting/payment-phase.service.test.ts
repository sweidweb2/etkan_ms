import { beforeEach, describe, expect, it, vi } from "vitest";
import * as classRepository from "@/repositories/class.repository";
import * as paymentPhaseRepository from "@/repositories/payment-phase.repository";
import * as profileRepository from "@/repositories/profile.repository";
import * as semesterRepository from "@/repositories/semester.repository";
import * as studentClassRepository from "@/repositories/student-class.repository";
import * as studentFinancialAdjustmentRepository from "@/repositories/student-financial-adjustment.repository";
import * as studentPaymentPhaseRepository from "@/repositories/student-payment-phase.repository";
import * as studentPaymentRepository from "@/repositories/student-payment.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import * as auditLogService from "@/services/audit-log.service";
import type { AuditActor } from "@/services/audit-log.service";
import {
  cancelPaymentPhaseForManager,
  createPaymentPhaseForManager,
  listMissingSppForOpenedPhases,
  repairMissingSppForManager,
  transferStudentPaymentPhaseForManager,
  updatePaymentPhaseForManager,
} from "@/services/payment-phase.service";
import * as accountingRecalcService from "@/services/accounting-recalc.service";

vi.mock("@/repositories/class.repository");
vi.mock("@/repositories/payment-phase.repository");
vi.mock("@/repositories/profile.repository");
vi.mock("@/repositories/semester.repository");
vi.mock("@/repositories/student-class.repository");
vi.mock("@/repositories/student-financial-adjustment.repository");
vi.mock("@/repositories/student-payment-phase.repository");
vi.mock("@/repositories/student-payment.repository");
vi.mock("@/repositories/student-profile.repository");
vi.mock("@/services/audit-log.service", () => ({
  recordManagerAuditLog: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/services/accounting-recalc.service", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/services/accounting-recalc.service")>();
  return {
    ...actual,
    recalcPhaseStatusFromSpps: vi.fn().mockResolvedValue(undefined),
  };
});

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

const semesterId = "66666666-6666-4666-8666-666666666666";
const classId = "22222222-2222-4222-8222-222222222222";
const phaseId = "33333333-3333-4333-8333-333333333333";
const studentA = "44444444-4444-4444-8444-444444444444";
const studentB = "55555555-5555-4555-8555-555555555555";

const validCreateInput = {
  name: "Fall tuition",
  semester_id: semesterId,
  amount: 1000,
  upfront_amount: 200,
  duration_months: 4,
  start_date: "2026-09-01",
  end_date: "2026-12-31",
};

const semesterRow = {
  id: semesterId,
  name: "Fall 2026",
  semester_code: "F26",
  start_date: "2026-09-01",
  end_date: "2026-12-31",
  created_at: "2026-01-01T00:00:00.000Z",
};

const billingClass = {
  id: classId,
  subject_id: null,
  name: "Math 101",
  status: "in_progress",
  semester_id: semesterId,
  created_at: "2026-01-01T00:00:00.000Z",
};

const phaseRecord = {
  id: phaseId,
  name: "Fall tuition",
  semester_id: semesterId,
  semester_code: "F26",
  amount: 1000,
  upfront_amount: 200,
  duration_months: 4,
  start_date: "2026-09-01",
  end_date: "2026-12-31",
  status: "opened",
  created_at: "2026-07-01T00:00:00.000Z",
  updated_at: "2026-07-01T00:00:00.000Z",
};

const phaseListRecord = {
  ...phaseRecord,
  semesters: {
    id: semesterId,
    name: "Fall 2026",
    semester_code: "F26",
  },
};

function mockBillingClass(data: typeof billingClass | null = billingClass) {
  vi.mocked(classRepository.findInProgressClassBySemesterId).mockResolvedValue({
    data,
    error: null,
    count: null,
    status: 200,
    statusText: "OK",
  } as never);
  vi.mocked(classRepository.listInProgressClassesForBilling).mockResolvedValue({
    data: data ? [data] : [],
    error: null,
    count: null,
    status: 200,
    statusText: "OK",
  } as never);
}

describe("createPaymentPhaseForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("rejects when an opened phase already exists for the semester", async () => {
    vi.mocked(semesterRepository.findSemesterById).mockResolvedValue({
      data: semesterRow,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      paymentPhaseRepository.findOpenedPaymentPhaseBySemesterId
    ).mockResolvedValue({
      data: phaseRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    const result = await createPaymentPhaseForManager(
      adminClient,
      actor.userId,
      actor,
      validCreateInput
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/already has an opened/i);
    }
    expect(paymentPhaseRepository.createPaymentPhase).not.toHaveBeenCalled();
  });

  it("creates a phase and seeds SPPs from the in-progress class", async () => {
    vi.mocked(semesterRepository.findSemesterById).mockResolvedValue({
      data: semesterRow,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      paymentPhaseRepository.findOpenedPaymentPhaseBySemesterId
    ).mockResolvedValue({
      data: null,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(paymentPhaseRepository.createPaymentPhase).mockResolvedValue({
      data: phaseRecord,
      error: null,
      count: null,
      status: 201,
      statusText: "Created",
    } as never);
    mockBillingClass();
    vi.mocked(
      studentClassRepository.listMemberUserIdsByClassId
    ).mockResolvedValue({
      data: [{ user_id: studentA }, { user_id: studentB }],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      studentPaymentPhaseRepository.createStudentPaymentPhases
    ).mockResolvedValue({
      data: [],
      error: null,
    } as never);

    const result = await createPaymentPhaseForManager(
      adminClient,
      actor.userId,
      actor,
      validCreateInput
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.phase.spp_active_count).toBe(2);
      expect(result.phase.semester_id).toBe(semesterId);
      expect(result.phase.semester_code).toBe("F26");
      expect(result.phase.billing_class_id).toBe(classId);
    }

    expect(
      studentPaymentPhaseRepository.createStudentPaymentPhases
    ).toHaveBeenCalledWith(
      adminClient,
      expect.arrayContaining([
        expect.objectContaining({
          student_id: studentA,
          payment_phase_id: phaseId,
          status: "pending",
          original_amount: 1000,
          remaining_amount: 1000,
        }),
        expect.objectContaining({
          student_id: studentB,
          payment_phase_id: phaseId,
        }),
      ])
    );
    expect(auditLogService.recordManagerAuditLog).toHaveBeenCalled();
  });

  it("creates a phase with no SPPs when no in-progress class exists", async () => {
    vi.mocked(semesterRepository.findSemesterById).mockResolvedValue({
      data: semesterRow,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      paymentPhaseRepository.findOpenedPaymentPhaseBySemesterId
    ).mockResolvedValue({
      data: null,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(paymentPhaseRepository.createPaymentPhase).mockResolvedValue({
      data: phaseRecord,
      error: null,
      count: null,
      status: 201,
      statusText: "Created",
    } as never);
    mockBillingClass(null);

    const result = await createPaymentPhaseForManager(
      adminClient,
      actor.userId,
      actor,
      validCreateInput
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.phase.spp_active_count).toBe(0);
      expect(result.phase.billing_class_id).toBeNull();
    }
    expect(
      studentClassRepository.listMemberUserIdsByClassId
    ).not.toHaveBeenCalled();
    expect(
      studentPaymentPhaseRepository.createStudentPaymentPhases
    ).not.toHaveBeenCalled();
  });
});

describe("listMissingSppForOpenedPhases", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns enrolled students without any SPP row on the billing class", async () => {
    vi.mocked(paymentPhaseRepository.listOpenedPaymentPhases).mockResolvedValue({
      data: [phaseListRecord],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    mockBillingClass();
    vi.mocked(
      studentClassRepository.listMemberUserIdsByClassIds
    ).mockResolvedValue({
      data: [
        { user_id: studentA, class_id: classId },
        { user_id: studentB, class_id: classId },
      ],
      error: null,
    } as never);
    vi.mocked(
      studentPaymentPhaseRepository.listSppsByPaymentPhaseIds
    ).mockResolvedValue({
      data: [
        {
          payment_phase_id: phaseId,
          status: "cancelled",
          student_id: studentA,
        },
      ],
      error: null,
    } as never);
    vi.mocked(profileRepository.listProfilesByIds).mockResolvedValue({
      data: [
        { id: studentB, username: "studentb", role: "student", created_at: "" },
      ],
      error: null,
    } as never);
    vi.mocked(
      studentProfileRepository.listStudentProfilesByUserIds
    ).mockResolvedValue({
      data: [{ id: "sp-1", user_id: studentB, full_name: "Student B" }],
      error: null,
    } as never);

    const missing = await listMissingSppForOpenedPhases(
      adminClient,
      actor.userId
    );

    expect(missing).toHaveLength(1);
    expect(missing[0]).toMatchObject({
      student_id: studentB,
      student_label: "Student B",
      payment_phase_id: phaseId,
      semester_id: semesterId,
      semester_name: "Fall 2026",
      billing_class_id: classId,
      billing_class_name: "Math 101",
    });
  });

  it("returns empty when no in-progress class exists", async () => {
    vi.mocked(paymentPhaseRepository.listOpenedPaymentPhases).mockResolvedValue({
      data: [phaseListRecord],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    mockBillingClass(null);

    const missing = await listMissingSppForOpenedPhases(
      adminClient,
      actor.userId
    );

    expect(missing).toEqual([]);
    expect(
      studentClassRepository.listMemberUserIdsByClassIds
    ).not.toHaveBeenCalled();
  });
});

describe("repairMissingSppForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("no-ops successfully when SPP already exists", async () => {
    vi.mocked(paymentPhaseRepository.findPaymentPhaseById).mockResolvedValue({
      data: phaseListRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      studentPaymentPhaseRepository.findSppByStudentAndPhase
    ).mockResolvedValue({
      data: {
        id: "spp-1",
        student_id: studentA,
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
      },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    const result = await repairMissingSppForManager(
      adminClient,
      actor.userId,
      actor,
      { payment_phase_id: phaseId, student_id: studentA }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.message).toMatch(/already exists/i);
    }
    expect(
      studentPaymentPhaseRepository.createStudentPaymentPhase
    ).not.toHaveBeenCalled();
  });

  it("creates a missing SPP for a student enrolled on the billing class", async () => {
    const createdSpp = {
      id: "spp-new",
      student_id: studentB,
      payment_phase_id: phaseId,
      assigned_at: "2026-07-29T00:00:00.000Z",
      status: "pending",
      original_amount: 1000,
      adjustment_amount: 0,
      final_amount_due: 1000,
      total_paid: 0,
      remaining_amount: 1000,
      created_at: "2026-07-29T00:00:00.000Z",
      updated_at: "2026-07-29T00:00:00.000Z",
    };

    vi.mocked(paymentPhaseRepository.findPaymentPhaseById).mockResolvedValue({
      data: phaseListRecord,
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
    mockBillingClass();
    vi.mocked(
      studentClassRepository.findStudentClassByUserAndClass
    ).mockResolvedValue({
      data: {
        id: "sc-1",
        user_id: studentB,
        class_id: classId,
        joined_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      studentPaymentPhaseRepository.createStudentPaymentPhase
    ).mockResolvedValue({
      data: createdSpp,
      error: null,
      count: null,
      status: 201,
      statusText: "Created",
    } as never);
    vi.mocked(
      studentPaymentPhaseRepository.listSppsByPaymentPhaseId
    ).mockResolvedValue({
      data: [createdSpp],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    const result = await repairMissingSppForManager(
      adminClient,
      actor.userId,
      actor,
      { payment_phase_id: phaseId, student_id: studentB }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.message).toMatch(/assigned/i);
    }
    expect(
      studentPaymentPhaseRepository.createStudentPaymentPhase
    ).toHaveBeenCalled();
    expect(
      paymentPhaseRepository.updatePaymentPhaseStatus
    ).not.toHaveBeenCalled();
    expect(auditLogService.recordManagerAuditLog).toHaveBeenCalled();
  });

  it("assigns onto a closed phase and reopens it when the new SPP is unpaid", async () => {
    const createdSpp = {
      id: "spp-new-closed",
      student_id: studentB,
      payment_phase_id: phaseId,
      assigned_at: "2026-07-29T00:00:00.000Z",
      status: "pending",
      original_amount: 1000,
      adjustment_amount: 0,
      final_amount_due: 1000,
      total_paid: 0,
      remaining_amount: 1000,
      created_at: "2026-07-29T00:00:00.000Z",
      updated_at: "2026-07-29T00:00:00.000Z",
    };

    vi.mocked(paymentPhaseRepository.findPaymentPhaseById).mockResolvedValue({
      data: { ...phaseListRecord, status: "closed" },
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
    mockBillingClass();
    vi.mocked(
      studentClassRepository.findStudentClassByUserAndClass
    ).mockResolvedValue({
      data: {
        id: "sc-1",
        user_id: studentB,
        class_id: classId,
        joined_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      studentPaymentPhaseRepository.createStudentPaymentPhase
    ).mockResolvedValue({
      data: createdSpp,
      error: null,
      count: null,
      status: 201,
      statusText: "Created",
    } as never);
    vi.mocked(paymentPhaseRepository.updatePaymentPhaseStatus).mockResolvedValue(
      {
        data: { ...phaseListRecord, status: "opened" },
        error: null,
        count: null,
        status: 200,
        statusText: "OK",
      } as never
    );
    vi.mocked(
      studentPaymentPhaseRepository.listSppsByPaymentPhaseId
    ).mockResolvedValue({
      data: [
        {
          ...sppActive,
          status: "paid",
        },
        createdSpp,
      ],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    const result = await repairMissingSppForManager(
      adminClient,
      actor.userId,
      actor,
      { payment_phase_id: phaseId, student_id: studentB }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.message).toMatch(/reopened/i);
    }
    expect(
      paymentPhaseRepository.updatePaymentPhaseStatus
    ).toHaveBeenCalledWith(adminClient, phaseId, "opened");
    expect(auditLogService.recordManagerAuditLog).toHaveBeenCalled();
  });

  it("rejects assigning to a cancelled payment phase", async () => {
    vi.mocked(paymentPhaseRepository.findPaymentPhaseById).mockResolvedValue({
      data: { ...phaseListRecord, status: "cancelled" },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    const result = await repairMissingSppForManager(
      adminClient,
      actor.userId,
      actor,
      { payment_phase_id: phaseId, student_id: studentB }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/opened or closed/i);
    }
    expect(
      studentPaymentPhaseRepository.createStudentPaymentPhase
    ).not.toHaveBeenCalled();
  });
});

const sppActive = {
  id: "spp-active",
  student_id: studentA,
  payment_phase_id: phaseId,
  assigned_at: "2026-07-01T00:00:00.000Z",
  status: "paid",
  original_amount: 1000,
  adjustment_amount: 0,
  final_amount_due: 1000,
  total_paid: 1000,
  remaining_amount: 0,
  created_at: "2026-07-01T00:00:00.000Z",
  updated_at: "2026-07-01T00:00:00.000Z",
};

const sppCancelled = {
  id: "spp-cancelled",
  student_id: studentB,
  payment_phase_id: phaseId,
  assigned_at: "2026-07-01T00:00:00.000Z",
  status: "cancelled",
  original_amount: 1000,
  adjustment_amount: 0,
  final_amount_due: 1000,
  total_paid: 0,
  remaining_amount: 1000,
  created_at: "2026-07-01T00:00:00.000Z",
  updated_at: "2026-07-01T00:00:00.000Z",
};

describe("updatePaymentPhaseForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
    mockBillingClass();
  });

  it("rejects updates when the phase is cancelled", async () => {
    vi.mocked(paymentPhaseRepository.findPaymentPhaseById).mockResolvedValue({
      data: { ...phaseListRecord, status: "cancelled" },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    const result = await updatePaymentPhaseForManager(
      adminClient,
      actor.userId,
      actor,
      {
        id: phaseId,
        name: "Fall tuition",
        amount: 1200,
        upfront_amount: 200,
        duration_months: 4,
        start_date: "2026-09-01",
        end_date: "2026-12-31",
      }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/cannot be edited/i);
    }
    expect(paymentPhaseRepository.updatePaymentPhase).not.toHaveBeenCalled();
  });

  it("recalcs non-cancelled SPPs and can reopen a closed phase", async () => {
    vi.mocked(paymentPhaseRepository.findPaymentPhaseById).mockResolvedValue({
      data: { ...phaseListRecord, status: "closed" },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(paymentPhaseRepository.updatePaymentPhase).mockResolvedValue({
      data: { ...phaseListRecord, status: "closed", amount: 1500 },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      studentPaymentPhaseRepository.listSppsByPaymentPhaseId
    ).mockResolvedValue({
      data: [sppActive, sppCancelled],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      studentPaymentRepository.listPaymentAmountsBySppIds
    ).mockResolvedValue({
      data: [{ student_payment_phase_id: sppActive.id, amount: 1000 }],
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
      data: { ...sppActive, status: "partially_paid", original_amount: 1500 },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(paymentPhaseRepository.updatePaymentPhaseStatus).mockResolvedValue(
      {
        data: { ...phaseListRecord, status: "opened", amount: 1500 },
        error: null,
        count: null,
        status: 200,
        statusText: "OK",
      } as never
    );
    vi.mocked(
      studentPaymentPhaseRepository.listSppsByPaymentPhaseIds
    ).mockResolvedValue({
      data: [
        {
          payment_phase_id: phaseId,
          status: "partially_paid",
          student_id: studentA,
        },
        {
          payment_phase_id: phaseId,
          status: "cancelled",
          student_id: studentB,
        },
      ],
      error: null,
    } as never);
    vi.mocked(
      studentPaymentPhaseRepository.listSppStatusRowsByPaymentPhaseIds
    ).mockResolvedValue({
      data: [
        { payment_phase_id: phaseId, status: "partially_paid" },
        { payment_phase_id: phaseId, status: "cancelled" },
      ],
      error: null,
    } as never);

    const result = await updatePaymentPhaseForManager(
      adminClient,
      actor.userId,
      actor,
      {
        id: phaseId,
        name: "Fall tuition",
        amount: 1500,
        upfront_amount: 200,
        duration_months: 4,
        start_date: "2026-09-01",
        end_date: "2026-12-31",
      }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.phase.status).toBe("opened");
    }

    expect(
      studentPaymentPhaseRepository.updateStudentPaymentPhaseFinancials
    ).toHaveBeenCalledTimes(1);
    expect(
      studentPaymentPhaseRepository.updateStudentPaymentPhaseFinancials
    ).toHaveBeenCalledWith(
      adminClient,
      sppActive.id,
      expect.objectContaining({
        status: "partially_paid",
        original_amount: 1500,
        total_paid: 1000,
      })
    );
    expect(paymentPhaseRepository.updatePaymentPhaseStatus).toHaveBeenCalledWith(
      adminClient,
      phaseId,
      "opened"
    );
  });
});

describe("cancelPaymentPhaseForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
    mockBillingClass();
  });

  it("cancels an opened phase without mutating SPPs", async () => {
    vi.mocked(paymentPhaseRepository.findPaymentPhaseById).mockResolvedValue({
      data: phaseListRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(paymentPhaseRepository.updatePaymentPhaseStatus).mockResolvedValue(
      {
        data: { ...phaseListRecord, status: "cancelled" },
        error: null,
        count: null,
        status: 200,
        statusText: "OK",
      } as never
    );
    vi.mocked(
      studentPaymentPhaseRepository.listSppsByPaymentPhaseIds
    ).mockResolvedValue({
      data: [],
      error: null,
    } as never);
    vi.mocked(
      studentPaymentPhaseRepository.listSppStatusRowsByPaymentPhaseIds
    ).mockResolvedValue({
      data: [],
      error: null,
    } as never);

    const result = await cancelPaymentPhaseForManager(
      adminClient,
      actor.userId,
      actor,
      { payment_phase_id: phaseId }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.phase.status).toBe("cancelled");
    }
    expect(
      studentPaymentPhaseRepository.updateStudentPaymentPhaseFinancials
    ).not.toHaveBeenCalled();
    expect(auditLogService.recordManagerAuditLog).toHaveBeenCalled();
  });

  it("rejects cancelling an already cancelled phase", async () => {
    vi.mocked(paymentPhaseRepository.findPaymentPhaseById).mockResolvedValue({
      data: { ...phaseListRecord, status: "cancelled" },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    const result = await cancelPaymentPhaseForManager(
      adminClient,
      actor.userId,
      actor,
      { payment_phase_id: phaseId }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/already cancelled/i);
    }
    expect(
      paymentPhaseRepository.updatePaymentPhaseStatus
    ).not.toHaveBeenCalled();
  });
});

describe("transferStudentPaymentPhaseForManager", () => {
  const sppId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const destPhaseId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const sppRecord = {
    id: sppId,
    student_id: studentA,
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

  const destPhase = {
    ...phaseListRecord,
    id: destPhaseId,
    name: "Spring tuition",
    status: "opened",
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
    vi.mocked(
      accountingRecalcService.recalcPhaseStatusFromSpps
    ).mockResolvedValue(undefined as never);
  });

  it("moves the SPP and recalculates source and destination phases", async () => {
    vi.mocked(studentPaymentPhaseRepository.findSppById).mockResolvedValue({
      data: sppRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(paymentPhaseRepository.findPaymentPhaseById).mockResolvedValue({
      data: destPhase,
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
      studentPaymentPhaseRepository.updateStudentPaymentPhasePaymentPhaseId
    ).mockResolvedValue({
      data: { ...sppRecord, payment_phase_id: destPhaseId },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    const result = await transferStudentPaymentPhaseForManager(
      adminClient,
      actor.userId,
      actor,
      { spp_id: sppId, destination_payment_phase_id: destPhaseId }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.from_payment_phase_id).toBe(phaseId);
      expect(result.to_payment_phase_id).toBe(destPhaseId);
    }
    expect(
      studentPaymentPhaseRepository.updateStudentPaymentPhasePaymentPhaseId
    ).toHaveBeenCalledWith(adminClient, sppId, destPhaseId);
    expect(
      accountingRecalcService.recalcPhaseStatusFromSpps
    ).toHaveBeenCalledWith(adminClient, phaseId);
    expect(
      accountingRecalcService.recalcPhaseStatusFromSpps
    ).toHaveBeenCalledWith(adminClient, destPhaseId);
  });

  it("rejects when destination equals source", async () => {
    vi.mocked(studentPaymentPhaseRepository.findSppById).mockResolvedValue({
      data: sppRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    const result = await transferStudentPaymentPhaseForManager(
      adminClient,
      actor.userId,
      actor,
      { spp_id: sppId, destination_payment_phase_id: phaseId }
    );

    expect(result.success).toBe(false);
    expect(
      studentPaymentPhaseRepository.updateStudentPaymentPhasePaymentPhaseId
    ).not.toHaveBeenCalled();
  });

  it("rejects cancelled destination phases", async () => {
    vi.mocked(studentPaymentPhaseRepository.findSppById).mockResolvedValue({
      data: sppRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(paymentPhaseRepository.findPaymentPhaseById).mockResolvedValue({
      data: { ...destPhase, status: "cancelled" },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    const result = await transferStudentPaymentPhaseForManager(
      adminClient,
      actor.userId,
      actor,
      { spp_id: sppId, destination_payment_phase_id: destPhaseId }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/opened or closed/i);
    }
  });

  it("rejects when student already has an SPP on destination", async () => {
    vi.mocked(studentPaymentPhaseRepository.findSppById).mockResolvedValue({
      data: sppRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(paymentPhaseRepository.findPaymentPhaseById).mockResolvedValue({
      data: destPhase,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      studentPaymentPhaseRepository.findSppByStudentAndPhase
    ).mockResolvedValue({
      data: { ...sppRecord, id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    const result = await transferStudentPaymentPhaseForManager(
      adminClient,
      actor.userId,
      actor,
      { spp_id: sppId, destination_payment_phase_id: destPhaseId }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/already has a payment record/i);
    }
  });

  it("rejects transferring a cancelled SPP", async () => {
    vi.mocked(studentPaymentPhaseRepository.findSppById).mockResolvedValue({
      data: { ...sppRecord, status: "cancelled" },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    const result = await transferStudentPaymentPhaseForManager(
      adminClient,
      actor.userId,
      actor,
      { spp_id: sppId, destination_payment_phase_id: destPhaseId }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/cancelled/i);
    }
  });
});
