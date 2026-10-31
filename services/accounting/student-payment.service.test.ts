import { beforeEach, describe, expect, it, vi } from "vitest";
import * as classRepository from "@/repositories/class.repository";
import * as paymentPhaseRepository from "@/repositories/payment-phase.repository";
import * as profileRepository from "@/repositories/profile.repository";
import * as studentPaymentPhaseRepository from "@/repositories/student-payment-phase.repository";
import * as studentPaymentRepository from "@/repositories/student-payment.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import * as clearanceRepository from "@/repositories/student-payment-phase-clearance.repository";
import * as semesterDropRequestRepository from "@/repositories/semester-drop-request.repository";
import * as auditLogService from "@/services/ops/audit-log.service";
import type { AuditActor } from "@/services/ops/audit-log.service";
import {
  createStudentPaymentForManager,
  deleteStudentPaymentForManager,
  deleteSppForManager,
  getSppDetailForManager,
  getSppDetailForSelf,
  listOpenSppsForSelf,
  listPaymentsForSppForSelf,
  sumStudentPaymentsForMonthForManager,
} from "@/services/accounting/student-payment.service";
import {
  assertPermission,
  assertStudentSelfAccess,
} from "@/services/auth/authorization.service";

vi.mock("@/repositories/class.repository");
vi.mock("@/repositories/payment-phase.repository");
vi.mock("@/repositories/profile.repository");
vi.mock("@/repositories/student-payment-phase.repository");
vi.mock("@/repositories/student-payment.repository");
vi.mock("@/repositories/student-profile.repository");
vi.mock("@/repositories/semester-drop-request.repository");
vi.mock("@/repositories/student-payment-phase-clearance.repository", () => ({
  findClearanceBySppId: vi.fn().mockResolvedValue({ data: null, error: null }),
  findClearancesBySppIds: vi.fn().mockResolvedValue({ data: [], error: null }),
  deleteClearanceById: vi.fn().mockResolvedValue({ data: null, error: null }),
}));
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
  hasPermission: vi.fn(async () => false),
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
    vi.mocked(
      studentPaymentRepository.createStudentPaymentWithRecalc
    ).mockResolvedValue({
      data: null,
      error: { message: "Cannot record payments on a cancelled payment phase." },
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
    expect(auditLogService.recordManagerAuditLog).not.toHaveBeenCalled();
  });

  it("rejects payments when the SPP is cancelled", async () => {
    vi.mocked(
      studentPaymentRepository.createStudentPaymentWithRecalc
    ).mockResolvedValue({
      data: null,
      error: {
        message: "Cannot record payments on a cancelled student assignment.",
      },
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

  it("records a payment via RPC and audits", async () => {
    vi.mocked(
      studentPaymentRepository.createStudentPaymentWithRecalc
    ).mockResolvedValue({
      data: { payment: paymentRecord, paymentPhaseId: phaseId },
      error: null,
    } as never);
    vi.mocked(studentPaymentPhaseRepository.findSppById).mockResolvedValue({
      data: {
        ...sppRecord,
        status: "paid",
        total_paid: 1000,
        remaining_amount: 0,
      },
      error: null,
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
    if (result.success) {
      expect(result.spp).toEqual({
        id: sppId,
        status: "paid",
        original_amount: 1000,
        adjustment_amount: 0,
        final_amount_due: 1000,
        total_paid: 1000,
        remaining_amount: 0,
      });
    }
    expect(
      studentPaymentRepository.createStudentPaymentWithRecalc
    ).toHaveBeenCalled();
    expect(
      studentPaymentPhaseRepository.updateStudentPaymentPhaseFinancials
    ).not.toHaveBeenCalled();
    expect(
      paymentPhaseRepository.updatePaymentPhaseStatus
    ).not.toHaveBeenCalled();
    expect(auditLogService.recordManagerAuditLog).toHaveBeenCalled();
  });

  it("rejects amount above the payment phase price", async () => {
    vi.mocked(
      studentPaymentRepository.createStudentPaymentWithRecalc
    ).mockResolvedValue({
      data: null,
      error: {
        message:
          "Amount must be greater than 0 and at most the payment phase price.",
      },
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

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.amount?.[0]).toMatch(/payment phase price/i);
    }
    expect(auditLogService.recordManagerAuditLog).not.toHaveBeenCalled();
  });
});

describe("getSppDetailForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(clearanceRepository.findClearanceBySppId).mockResolvedValue({
      data: null,
      error: null,
    } as never);
    vi.mocked(
      semesterDropRequestRepository.findCompletedDropBySppId
    ).mockResolvedValue({
      data: null,
      error: null,
    } as never);
  });

  it("sets has_credit when remaining amount is negative (E9)", async () => {
    vi.mocked(studentPaymentPhaseRepository.findSppById).mockResolvedValue({
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
    vi.mocked(paymentPhaseRepository.findPaymentPhaseById).mockResolvedValue({
      data: phaseRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(profileRepository.findProfileById).mockResolvedValue({
      data: {
        id: "student-1",
        username: "student",
        role: "student",
        created_at: "",
      },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      studentProfileRepository.listStudentProfilesByUserIds
    ).mockResolvedValue({
      data: [
        {
          id: "sp-1",
          user_id: "student-1",
          full_name: "Student One",
        },
      ],
      error: null,
    } as never);
    vi.mocked(classRepository.findInProgressClassBySemesterId).mockResolvedValue(
      {
        data: null,
        error: null,
        count: null,
        status: 200,
        statusText: "OK",
      } as never
    );

    const detail = await getSppDetailForManager(
      adminClient,
      actor.userId,
      phaseId,
      sppId
    );

    expect(detail).not.toBeNull();
    expect(detail?.remaining_amount).toBe(-200);
    expect(detail?.has_credit).toBe(true);
    expect(detail?.status).toBe("paid");
    expect(detail?.payments_blocked).toBe(true);
    expect(detail?.drop_completed).toBe(false);
    expect(detail?.student_profile_id).toBe("sp-1");
  });
});

describe("deleteStudentPaymentForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("deletes a payment via RPC and audits", async () => {
    vi.mocked(
      studentPaymentRepository.deleteStudentPaymentWithRecalc
    ).mockResolvedValue({
      data: {
        deleted: paymentRecord,
        studentPaymentPhaseId: sppId,
        paymentPhaseId: phaseId,
      },
      error: null,
    } as never);
    vi.mocked(studentPaymentPhaseRepository.findSppById).mockResolvedValue({
      data: sppRecord,
      error: null,
    } as never);

    const result = await deleteStudentPaymentForManager(
      adminClient,
      actor.userId,
      actor,
      { id: paymentId, student_payment_phase_id: sppId }
    );

    expect(result.success).toBe(true);
    expect(
      studentPaymentRepository.deleteStudentPaymentWithRecalc
    ).toHaveBeenCalledWith(adminClient, paymentId, sppId);
    expect(
      paymentPhaseRepository.updatePaymentPhaseStatus
    ).not.toHaveBeenCalled();
    expect(auditLogService.recordManagerAuditLog).toHaveBeenCalled();
  });
});

describe("deleteSppForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("rejects when unauthorized", async () => {
    const result = await deleteSppForManager(adminClient, null, actor, {
      id: sppId,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Unauthorized.");
    }
    expect(
      studentPaymentPhaseRepository.deleteStudentPaymentPhaseWithRecalc
    ).not.toHaveBeenCalled();
  });

  it("rejects when the SPP has payments", async () => {
    vi.mocked(
      studentPaymentPhaseRepository.deleteStudentPaymentPhaseWithRecalc
    ).mockResolvedValue({
      data: null,
      error: {
        message:
          "This student payment phase has payments. Delete all payments first.",
      },
    } as never);

    const result = await deleteSppForManager(
      adminClient,
      actor.userId,
      actor,
      { id: sppId }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/has payments/i);
    }
    expect(auditLogService.recordManagerAuditLog).not.toHaveBeenCalled();
  });

  it("deletes a payment-free SPP via RPC and audits", async () => {
    vi.mocked(
      studentPaymentPhaseRepository.deleteStudentPaymentPhaseWithRecalc
    ).mockResolvedValue({
      data: { deleted: sppRecord, paymentPhaseId: phaseId },
      error: null,
    } as never);

    const result = await deleteSppForManager(
      adminClient,
      actor.userId,
      actor,
      { id: sppId }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.payment_phase_id).toBe(phaseId);
      expect(result.message).toMatch(/deleted/i);
    }
    expect(
      studentPaymentPhaseRepository.deleteStudentPaymentPhaseWithRecalc
    ).toHaveBeenCalledWith(adminClient, sppId);
    expect(
      studentPaymentPhaseRepository.updateStudentPaymentPhaseFinancials
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

describe("sumStudentPaymentsForMonthForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("sums payment amounts for the current calendar month", async () => {
    vi.mocked(
      studentPaymentRepository.listPaymentAmountsBetween
    ).mockResolvedValue({
      data: [
        { payment_date: "2026-08-02", amount: 100 },
        { payment_date: "2026-08-15", amount: 250.5 },
      ],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    const total = await sumStudentPaymentsForMonthForManager(
      adminClient,
      actor.userId,
      new Date("2026-08-16T12:00:00")
    );

    expect(total).toBe(350.5);
    expect(
      studentPaymentRepository.listPaymentAmountsBetween
    ).toHaveBeenCalledWith(adminClient, "2026-08-01", "2026-09-01");
  });
});

const studentUserId = "student-1";

describe("listOpenSppsForSelf", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(assertPermission).mockImplementation(async (_c, userId) => {
      if (!userId) throw new Error("Unauthorized.");
    });
    vi.mocked(assertStudentSelfAccess).mockImplementation(async (_c, userId) => {
      if (!userId) throw new Error("Unauthorized.");
      return userId as string;
    });
    vi.mocked(clearanceRepository.findClearancesBySppIds).mockResolvedValue({
      data: [],
      error: null,
    } as never);
  });

  it("returns mapped open-phase SPPs for the signed-in student", async () => {
    vi.mocked(
      studentPaymentPhaseRepository.listOpenPhaseSppsByStudentId
    ).mockResolvedValue({
      data: [
        {
          ...sppRecord,
          payment_phases: phaseRecord,
        },
      ],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    const rows = await listOpenSppsForSelf(adminClient, studentUserId);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: sppId,
      payment_phase_id: phaseId,
      payment_phase_name: "Fall tuition",
      semester_name: "Fall",
      status: "pending",
      remaining_amount: 1000,
    });
    expect(
      studentPaymentPhaseRepository.listOpenPhaseSppsByStudentId
    ).toHaveBeenCalledWith(adminClient, studentUserId);
  });

  it("rejects unauthenticated callers", async () => {
    await expect(listOpenSppsForSelf(adminClient, null)).rejects.toThrow(
      "Unauthorized."
    );
  });
});

describe("getSppDetailForSelf", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(assertPermission).mockImplementation(async (_c, userId) => {
      if (!userId) throw new Error("Unauthorized.");
    });
    vi.mocked(assertStudentSelfAccess).mockImplementation(async (_c, userId) => {
      if (!userId) throw new Error("Unauthorized.");
      return userId as string;
    });
    vi.mocked(clearanceRepository.findClearanceBySppId).mockResolvedValue({
      data: null,
      error: null,
    } as never);
  });

  it("returns own open-phase SPP detail", async () => {
    vi.mocked(
      studentPaymentPhaseRepository.findSppWithPhaseById
    ).mockResolvedValue({
      data: {
        ...sppRecord,
        payment_phases: phaseRecord,
      },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(profileRepository.findProfileById).mockResolvedValue({
      data: {
        id: studentUserId,
        username: "student",
        role: "student",
        created_at: "",
      },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      studentProfileRepository.listStudentProfilesByUserIds
    ).mockResolvedValue({
      data: [
        {
          id: "sp-1",
          user_id: studentUserId,
          full_name: "Student One",
        },
      ],
      error: null,
    } as never);
    vi.mocked(classRepository.findInProgressClassBySemesterId).mockResolvedValue(
      {
        data: null,
        error: null,
        count: null,
        status: 200,
        statusText: "OK",
      } as never
    );

    const detail = await getSppDetailForSelf(
      adminClient,
      studentUserId,
      sppId
    );

    expect(detail).not.toBeNull();
    expect(detail?.payment_phase_name).toBe("Fall tuition");
    expect(detail?.student_label).toBe("Student One");
  });

  it("returns null for another student's SPP", async () => {
    vi.mocked(
      studentPaymentPhaseRepository.findSppWithPhaseById
    ).mockResolvedValue({
      data: {
        ...sppRecord,
        student_id: "other-student",
        payment_phases: phaseRecord,
      },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    const detail = await getSppDetailForSelf(
      adminClient,
      studentUserId,
      sppId
    );

    expect(detail).toBeNull();
  });

  it("returns null when the phase is closed", async () => {
    vi.mocked(
      studentPaymentPhaseRepository.findSppWithPhaseById
    ).mockResolvedValue({
      data: {
        ...sppRecord,
        payment_phases: { ...phaseRecord, status: "closed" },
      },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    const detail = await getSppDetailForSelf(
      adminClient,
      studentUserId,
      sppId
    );

    expect(detail).toBeNull();
  });

  it("returns null when the SPP is cancelled", async () => {
    vi.mocked(
      studentPaymentPhaseRepository.findSppWithPhaseById
    ).mockResolvedValue({
      data: {
        ...sppRecord,
        status: "cancelled",
        payment_phases: phaseRecord,
      },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    const detail = await getSppDetailForSelf(
      adminClient,
      studentUserId,
      sppId
    );

    expect(detail).toBeNull();
  });
});

describe("listPaymentsForSppForSelf", () => {
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

  it("lists payments for owned SPP", async () => {
    vi.mocked(studentPaymentPhaseRepository.findSppById).mockResolvedValue({
      data: sppRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(studentPaymentRepository.listPaymentsBySppId).mockResolvedValue({
      data: [paymentRecord],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    const rows = await listPaymentsForSppForSelf(
      adminClient,
      studentUserId,
      sppId
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.amount).toBe(1000);
  });

  it("returns empty list for another student's SPP", async () => {
    vi.mocked(studentPaymentPhaseRepository.findSppById).mockResolvedValue({
      data: { ...sppRecord, student_id: "other-student" },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    const rows = await listPaymentsForSppForSelf(
      adminClient,
      studentUserId,
      sppId
    );

    expect(rows).toEqual([]);
    expect(studentPaymentRepository.listPaymentsBySppId).not.toHaveBeenCalled();
  });
});
