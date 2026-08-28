import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as classRepository from "@/repositories/class.repository";
import * as paymentPhaseRepository from "@/repositories/payment-phase.repository";
import * as profileRepository from "@/repositories/profile.repository";
import * as studentClassRepository from "@/repositories/student-class.repository";
import * as studentPaymentPhaseRepository from "@/repositories/student-payment-phase.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import * as auditLogService from "@/services/ops/audit-log.service";
import type { AuditActor } from "@/services/ops/audit-log.service";
import {
  cancelPaymentPhaseForManager,
  createPaymentPhaseForManager,
  listMissingSppForOpenedPhases,
  listPaymentPhasesForManager,
  repairMissingSppForManager,
  transferStudentPaymentPhaseForManager,
  updatePaymentPhaseForManager,
} from "@/services/accounting/payment-phase.service";
import * as accountingRecalcService from "@/services/accounting/accounting-recalc.service";

vi.mock("@/repositories/class.repository");
vi.mock("@/repositories/payment-phase.repository");
vi.mock("@/repositories/profile.repository");
vi.mock("@/repositories/semester.repository");
vi.mock("@/repositories/student-class.repository");
vi.mock("@/repositories/student-payment-phase.repository");
vi.mock("@/repositories/student-profile.repository");
vi.mock("@/services/ops/audit-log.service", () => ({
  recordManagerAuditLog: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/services/accounting/accounting-recalc.service", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/services/accounting/accounting-recalc.service")>();
  return {
    ...actual,
    recalcPhaseStatusFromSpps: vi.fn().mockResolvedValue(undefined),
    recalcNonCancelledSppsForPhase: vi.fn(),
  };
});

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
    vi.mocked(paymentPhaseRepository.createPaymentPhaseWithSpps).mockResolvedValue(
      {
        data: null,
        error: {
          message: "This semester already has an opened payment phase.",
        },
      } as never
    );

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
    expect(auditLogService.recordManagerAuditLog).not.toHaveBeenCalled();
  });

  it("creates a phase and seeds SPPs from the in-progress class", async () => {
    vi.mocked(paymentPhaseRepository.createPaymentPhaseWithSpps).mockResolvedValue(
      {
        data: {
          phase: phaseRecord,
          semester: {
            id: semesterId,
            name: "Fall 2026",
            semester_code: "F26",
          },
          sppCount: 2,
          billingClass: { id: classId, name: "Math 101" },
        },
        error: null,
      } as never
    );

    const result = await createPaymentPhaseForManager(
      adminClient,
      actor.userId,
      actor,
      validCreateInput
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.phase.spp_active_count).toBe(2);
      expect(result.phase.spp_paid_count).toBe(0);
      expect(result.phase.semester_id).toBe(semesterId);
      expect(result.phase.semester_code).toBe("F26");
      expect(result.phase.billing_class_id).toBe(classId);
    }

    expect(
      paymentPhaseRepository.createPaymentPhaseWithSpps
    ).toHaveBeenCalledWith(
      adminClient,
      expect.objectContaining({
        name: "Fall tuition",
        semester_id: semesterId,
        amount: 1000,
      })
    );
    expect(
      studentPaymentPhaseRepository.createStudentPaymentPhases
    ).not.toHaveBeenCalled();
    expect(auditLogService.recordManagerAuditLog).toHaveBeenCalled();
  });

  it("creates a phase with no SPPs when no in-progress class exists", async () => {
    vi.mocked(paymentPhaseRepository.createPaymentPhaseWithSpps).mockResolvedValue(
      {
        data: {
          phase: phaseRecord,
          semester: {
            id: semesterId,
            name: "Fall 2026",
            semester_code: "F26",
          },
          sppCount: 0,
          billingClass: null,
        },
        error: null,
      } as never
    );

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

function mockListPhasesForManager(
  phases: typeof phaseListRecord[] = [phaseListRecord]
) {
  vi.mocked(paymentPhaseRepository.listPaymentPhases).mockResolvedValue({
    data: phases,
    error: null,
    count: null,
    status: 200,
    statusText: "OK",
  } as never);
  vi.mocked(
    studentPaymentPhaseRepository.listSppStatusRowsByPaymentPhaseIds
  ).mockResolvedValue({
    data: [],
    error: null,
  } as never);
}

function mockSnapshotClasses(
  data: Array<{
    id: string;
    name: string;
    semester_id: string;
    status: string;
  }> = [
    {
      id: classId,
      name: "Math 101",
      semester_id: semesterId,
      status: "in_progress",
    },
  ]
) {
  vi.mocked(classRepository.listInProgressClassesWithSemester).mockResolvedValue({
    data,
    error: null,
    count: null,
    status: 200,
    statusText: "OK",
  } as never);
  vi.mocked(
    studentProfileRepository.listStudentProfilesExcludingUserIds
  ).mockResolvedValue({
    data: [],
    error: null,
  } as never);
  vi.mocked(
    studentPaymentPhaseRepository.listSppsByPaymentPhaseIds
  ).mockResolvedValue({
    data: [],
    error: null,
  } as never);
}

describe("listMissingSppForOpenedPhases", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns enrolled students without any SPP row on the billing class", async () => {
    mockListPhasesForManager();
    mockBillingClass();
    mockSnapshotClasses();
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
    mockListPhasesForManager();
    mockBillingClass(null);
    mockSnapshotClasses([]);

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
    vi.mocked(studentPaymentPhaseRepository.repairMissingSpp).mockResolvedValue({
      data: {
        alreadyExisted: true,
        created: false,
        reactivated: false,
        phaseReopened: false,
        spp: {
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
      },
      error: null,
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
    expect(auditLogService.recordManagerAuditLog).not.toHaveBeenCalled();
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

    vi.mocked(studentPaymentPhaseRepository.repairMissingSpp).mockResolvedValue({
      data: {
        alreadyExisted: false,
        created: true,
        reactivated: false,
        phaseReopened: false,
        spp: createdSpp,
      },
      error: null,
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
      studentPaymentPhaseRepository.repairMissingSpp
    ).toHaveBeenCalledWith(adminClient, phaseId, studentB);
    expect(
      studentPaymentPhaseRepository.createStudentPaymentPhase
    ).not.toHaveBeenCalled();
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

    vi.mocked(studentPaymentPhaseRepository.repairMissingSpp).mockResolvedValue({
      data: {
        alreadyExisted: false,
        created: true,
        reactivated: false,
        phaseReopened: true,
        spp: createdSpp,
      },
      error: null,
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
    ).not.toHaveBeenCalled();
    expect(auditLogService.recordManagerAuditLog).toHaveBeenCalledTimes(2);
  });

  it("rejects assigning to a cancelled payment phase", async () => {
    vi.mocked(studentPaymentPhaseRepository.repairMissingSpp).mockResolvedValue({
      data: null,
      error: {
        message:
          "Only opened or closed payment phases can receive assignments.",
      },
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

describe("updatePaymentPhaseForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
    mockBillingClass();
    vi.mocked(
      accountingRecalcService.recalcNonCancelledSppsForPhase
    ).mockResolvedValue({
      sppRecalculated: 0,
      nextPhaseStatus: "opened",
    } as never);
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
      accountingRecalcService.recalcNonCancelledSppsForPhase
    ).mockResolvedValue({
      sppRecalculated: 1,
      nextPhaseStatus: "opened",
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
      accountingRecalcService.recalcNonCancelledSppsForPhase
    ).toHaveBeenCalledWith(adminClient, phaseId);
    expect(
      studentPaymentPhaseRepository.updateStudentPaymentPhaseFinancials
    ).not.toHaveBeenCalled();
    expect(
      paymentPhaseRepository.updatePaymentPhaseStatus
    ).not.toHaveBeenCalled();
  });
});

describe("cancelPaymentPhaseForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("cancels an opened phase without mutating SPPs", async () => {
    vi.mocked(paymentPhaseRepository.cancelPaymentPhase).mockResolvedValue({
      data: {
        phase: { ...phaseRecord, status: "cancelled" },
        previousStatus: "opened",
        semester: {
          id: semesterId,
          name: "Fall 2026",
          semester_code: "F26",
        },
        sppActiveCount: 0,
        sppPaidCount: 0,
        billingClass: { id: classId, name: "Math 101" },
      },
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
    expect(paymentPhaseRepository.cancelPaymentPhase).toHaveBeenCalledWith(
      adminClient,
      phaseId
    );
    expect(
      studentPaymentPhaseRepository.updateStudentPaymentPhaseFinancials
    ).not.toHaveBeenCalled();
    expect(
      paymentPhaseRepository.updatePaymentPhaseStatus
    ).not.toHaveBeenCalled();
    expect(auditLogService.recordManagerAuditLog).toHaveBeenCalled();
  });

  it("rejects cancelling an already cancelled phase", async () => {
    vi.mocked(paymentPhaseRepository.cancelPaymentPhase).mockResolvedValue({
      data: null,
      error: { message: "This payment phase is already cancelled." },
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

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("moves the SPP via RPC and audits", async () => {
    vi.mocked(
      studentPaymentPhaseRepository.transferStudentPaymentPhase
    ).mockResolvedValue({
      data: {
        sppId,
        studentId: studentA,
        fromPaymentPhaseId: phaseId,
        toPaymentPhaseId: destPhaseId,
      },
      error: null,
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
      studentPaymentPhaseRepository.transferStudentPaymentPhase
    ).toHaveBeenCalledWith(adminClient, sppId, destPhaseId);
    expect(
      studentPaymentPhaseRepository.updateStudentPaymentPhasePaymentPhaseId
    ).not.toHaveBeenCalled();
    expect(
      accountingRecalcService.recalcPhaseStatusFromSpps
    ).not.toHaveBeenCalled();
    expect(auditLogService.recordManagerAuditLog).toHaveBeenCalled();
  });

  it("rejects when destination equals source", async () => {
    vi.mocked(
      studentPaymentPhaseRepository.transferStudentPaymentPhase
    ).mockResolvedValue({
      data: null,
      error: {
        message: "Destination must be different from the current payment phase.",
      },
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
    vi.mocked(
      studentPaymentPhaseRepository.transferStudentPaymentPhase
    ).mockResolvedValue({
      data: null,
      error: {
        message: "Destination must be an opened or closed payment phase.",
      },
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
    vi.mocked(
      studentPaymentPhaseRepository.transferStudentPaymentPhase
    ).mockResolvedValue({
      data: null,
      error: {
        message: "Student already has a payment record on that phase.",
      },
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
    vi.mocked(
      studentPaymentPhaseRepository.transferStudentPaymentPhase
    ).mockResolvedValue({
      data: null,
      error: {
        message: "Cancelled student payment phases cannot be transferred.",
      },
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

describe("listPaymentPhasesForManager SPP counts", () => {
  // Upfront 200 of a 1000 phase: one student covered the upfront only, one is
  // short of it, one is fully paid, one is cancelled.
  const sppStatusRows = [
    { payment_phase_id: phaseId, status: "partially_paid", total_paid: 200 },
    { payment_phase_id: phaseId, status: "partially_paid", total_paid: 150 },
    { payment_phase_id: phaseId, status: "paid", total_paid: 1000 },
    { payment_phase_id: phaseId, status: "cancelled", total_paid: 0 },
  ];

  function mockPhaseList(record: typeof phaseListRecord) {
    vi.mocked(paymentPhaseRepository.listPaymentPhases).mockResolvedValue({
      data: [record],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      studentPaymentPhaseRepository.listSppStatusRowsByPaymentPhaseIds
    ).mockResolvedValue({ data: sppStatusRows, error: null } as never);
    mockBillingClass();
  }

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("counts upfront payers during the first month of an upfront phase", async () => {
    vi.setSystemTime(new Date("2026-09-20T09:00:00Z"));
    mockPhaseList(phaseListRecord);

    const [phase] = await listPaymentPhasesForManager(adminClient, actor.userId);

    expect(phase.upfront_window_active).toBe(true);
    expect(phase.spp_paid_count).toBe(2);
    expect(phase.spp_active_count).toBe(3);
  });

  it("counts only fully paid students once the first month has passed", async () => {
    vi.setSystemTime(new Date("2026-10-01T09:00:00Z"));
    mockPhaseList(phaseListRecord);

    const [phase] = await listPaymentPhasesForManager(adminClient, actor.userId);

    expect(phase.upfront_window_active).toBe(false);
    expect(phase.spp_paid_count).toBe(1);
    expect(phase.spp_active_count).toBe(3);
  });

  it("ignores upfront mode for phases that are not opened", async () => {
    vi.setSystemTime(new Date("2026-09-20T09:00:00Z"));
    mockPhaseList({ ...phaseListRecord, status: "closed" });

    const [phase] = await listPaymentPhasesForManager(adminClient, actor.userId);

    expect(phase.upfront_window_active).toBe(false);
    expect(phase.spp_paid_count).toBe(1);
  });

  it("ignores upfront mode when the phase has no upfront amount", async () => {
    vi.setSystemTime(new Date("2026-09-20T09:00:00Z"));
    mockPhaseList({ ...phaseListRecord, upfront_amount: 0 });

    const [phase] = await listPaymentPhasesForManager(adminClient, actor.userId);

    expect(phase.upfront_window_active).toBe(false);
    expect(phase.spp_paid_count).toBe(1);
  });
});
