import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFinancialAdjustmentSchema,
  updateFinancialAdjustmentSchema,
} from "@/lib/validators/manager/create-financial-adjustment";
import { checkPublicFinancialFormSubmitRateLimit } from "@/lib/rate-limit/public-financial-form-rate-limit";
import * as paymentPhaseRepository from "@/repositories/payment-phase.repository";
import * as studentFinancialAdjustmentRepository from "@/repositories/student-financial-adjustment.repository";
import * as studentFinancialFormInviteRepository from "@/repositories/student-financial-form-invite.repository";
import * as studentFinancialFormRepository from "@/repositories/student-financial-form.repository";
import * as studentPaymentPhaseRepository from "@/repositories/student-payment-phase.repository";
import * as studentPaymentRepository from "@/repositories/student-payment.repository";
import * as auditLogService from "@/services/audit-log.service";
import type { AuditActor } from "@/services/audit-log.service";
import {
  createAdjustmentForManager,
  createFinancialFormForManager,
  createFinancialFormInviteForManager,
  deleteAdjustmentForManager,
  deleteFinancialFormInviteForManager,
  submitFinancialFormByToken,
  updateAdjustmentForManager,
} from "@/services/student-financial-adjustment.service";

vi.mock("@/repositories/payment-phase.repository");
vi.mock("@/repositories/student-payment-phase.repository");
vi.mock("@/repositories/student-payment.repository");
vi.mock("@/repositories/student-financial-adjustment.repository");
vi.mock("@/repositories/student-financial-form.repository");
vi.mock("@/repositories/student-financial-form-invite.repository");
vi.mock("@/repositories/profile.repository", () => ({
  findProfileById: vi.fn().mockResolvedValue({ data: { username: "jane" }, error: null }),
}));
vi.mock("@/repositories/student-profile.repository", () => ({
  listStudentProfilesByUserIds: vi.fn().mockResolvedValue({
    data: [{ id: "sp1", full_name: "Jane Student" }],
    error: null,
  }),
}));
vi.mock("@/lib/manager/accounting/financial-form-invite-url", () => ({
  getFinancialFormInviteUrl: (token: string) =>
    `http://localhost:3000/f/${token}`,
}));
vi.mock("@/lib/rate-limit/public-financial-form-rate-limit");
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
const adjustmentId = "55555555-5555-4555-8555-555555555555";
const formId = "66666666-6666-4666-8666-666666666666";
const inviteId = "77777777-7777-4777-8777-777777777777";
const inviteToken = "test-invite-token-abcdefghijklmnopqrstuvwxyz";

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

const adjustmentRecord = {
  id: adjustmentId,
  student_payment_phase_id: sppId,
  type: "scholarship",
  value_type: "percentage",
  value: 100,
  reason: "Full scholarship",
  effective_date: "2026-07-15",
  created_at: "2026-07-15T00:00:00.000Z",
  updated_at: "2026-07-15T00:00:00.000Z",
};

const formRecord = {
  id: formId,
  student_payment_phase_id: sppId,
  invite_id: null,
  full_name: "Jane Student",
  school_or_university: null,
  date_of_birth: null,
  phone: null,
  parent_phone: null,
  current_gpa: null,
  received_financial_aid_before: false,
  certificates: null,
  family_members: null,
  working_family_members: null,
  total_family_income: null,
  children_currently_learning: null,
  has_deceased_parent: false,
  both_parents_work: false,
  family_hardship: false,
  family_chronic_disease: false,
  affordable_monthly_payment: null,
  student_works: false,
  student_monthly_income: null,
  agreed_to_rules: true,
  created_at: "2026-07-15T00:00:00.000Z",
  updated_at: "2026-07-15T00:00:00.000Z",
};

const inviteRecord = {
  id: inviteId,
  student_payment_phase_id: sppId,
  token: inviteToken,
  created_by: actor.userId,
  created_at: "2026-07-15T00:00:00.000Z",
  used_at: null,
  form_id: null,
};

function mockOkLoad() {
  vi.mocked(studentPaymentPhaseRepository.findSppById).mockResolvedValue({
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
}

function mockRecalcAfterScholarship() {
  vi.mocked(studentPaymentPhaseRepository.findSppById).mockResolvedValue({
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
  vi.mocked(
    studentPaymentRepository.listPaymentAmountsBySppIds
  ).mockResolvedValue({
    data: [],
    error: null,
  } as never);
  vi.mocked(
    studentFinancialAdjustmentRepository.listAdjustmentsBySppIds
  ).mockResolvedValue({
    data: [
      {
        student_payment_phase_id: sppId,
        value_type: "percentage",
        value: 100,
      },
    ],
    error: null,
  } as never);
  vi.mocked(
    studentPaymentPhaseRepository.updateStudentPaymentPhaseFinancials
  ).mockResolvedValue({
    data: {
      ...sppRecord,
      status: "paid",
      adjustment_amount: 1000,
      final_amount_due: 0,
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
    data: [
      {
        ...sppRecord,
        status: "paid",
        adjustment_amount: 1000,
        final_amount_due: 0,
        remaining_amount: 0,
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
}

describe("createFinancialAdjustmentSchema", () => {
  it("rejects percentage values above 100", () => {
    const parsed = updateFinancialAdjustmentSchema.safeParse({
      id: adjustmentId,
      student_payment_phase_id: sppId,
      type: "discount",
      value_type: "percentage",
      value: 150,
      reason: "",
      effective_date: "2026-07-15",
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const valueIssue = parsed.error.issues.find(
        (issue) => issue.path[0] === "value"
      );
      expect(valueIssue?.message).toMatch(/at most 100/i);
    }
  });

  it("accepts fixed values above 100", () => {
    const parsed = createFinancialAdjustmentSchema.safeParse({
      student_payment_phase_id: sppId,
      type: "discount",
      value_type: "fixed",
      value: 150,
      reason: "",
      effective_date: "2026-07-15",
    });

    expect(parsed.success).toBe(true);
  });
});

describe("createAdjustmentForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("rejects a second adjustment for the same SPP", async () => {
    mockOkLoad();
    vi.mocked(
      studentFinancialAdjustmentRepository.findAdjustmentBySppId
    ).mockResolvedValue({
      data: adjustmentRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    const result = await createAdjustmentForManager(
      adminClient,
      actor.userId,
      actor,
      {
        student_payment_phase_id: sppId,
        type: "discount",
        value_type: "fixed",
        value: 100,
        effective_date: "2026-07-15",
      }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/already has a financial adjustment/i);
    }
    expect(
      studentFinancialAdjustmentRepository.createAdjustment
    ).not.toHaveBeenCalled();
  });

  it("rejects adjustments when the phase is cancelled", async () => {
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

    const result = await createAdjustmentForManager(
      adminClient,
      actor.userId,
      actor,
      {
        student_payment_phase_id: sppId,
        type: "discount",
        value_type: "fixed",
        value: 100,
        effective_date: "2026-07-15",
      }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/cancelled payment phase/i);
    }
  });

  it("rejects adjustments when the SPP is cancelled", async () => {
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

    const result = await createAdjustmentForManager(
      adminClient,
      actor.userId,
      actor,
      {
        student_payment_phase_id: sppId,
        type: "discount",
        value_type: "fixed",
        value: 100,
        effective_date: "2026-07-15",
      }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/cancelled student assignment/i);
    }
  });

  it("marks SPP paid with 100% scholarship and may close the phase", async () => {
    vi.mocked(
      studentFinancialAdjustmentRepository.findAdjustmentBySppId
    ).mockResolvedValue({
      data: null,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      studentFinancialAdjustmentRepository.createAdjustment
    ).mockResolvedValue({
      data: adjustmentRecord,
      error: null,
      count: null,
      status: 201,
      statusText: "Created",
    } as never);
    mockRecalcAfterScholarship();

    const result = await createAdjustmentForManager(
      adminClient,
      actor.userId,
      actor,
      {
        student_payment_phase_id: sppId,
        type: "scholarship",
        value_type: "percentage",
        value: 100,
        reason: "Full scholarship",
        effective_date: "2026-07-15",
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
        final_amount_due: 0,
        adjustment_amount: 1000,
      })
    );
    expect(paymentPhaseRepository.updatePaymentPhaseStatus).toHaveBeenCalledWith(
      adminClient,
      phaseId,
      "closed"
    );
  });
});

describe("deleteAdjustmentForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("recalculates due after delete", async () => {
    vi.mocked(
      studentFinancialAdjustmentRepository.findAdjustmentById
    ).mockResolvedValue({
      data: adjustmentRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      studentFinancialAdjustmentRepository.deleteAdjustment
    ).mockResolvedValue({
      data: null,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    vi.mocked(studentPaymentPhaseRepository.findSppById).mockResolvedValue({
      data: {
        ...sppRecord,
        status: "paid",
        adjustment_amount: 1000,
        final_amount_due: 0,
        remaining_amount: 0,
      },
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
        adjustment_amount: 0,
        final_amount_due: 1000,
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
          adjustment_amount: 0,
          final_amount_due: 1000,
          remaining_amount: 1000,
        },
      ],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(paymentPhaseRepository.updatePaymentPhaseStatus).mockResolvedValue(
      {
        data: { ...phaseRecord, status: "opened" },
        error: null,
        count: null,
        status: 200,
        statusText: "OK",
      } as never
    );

    const result = await deleteAdjustmentForManager(
      adminClient,
      actor.userId,
      actor,
      { id: adjustmentId, student_payment_phase_id: sppId }
    );

    expect(result.success).toBe(true);
    expect(
      studentPaymentPhaseRepository.updateStudentPaymentPhaseFinancials
    ).toHaveBeenCalledWith(
      adminClient,
      sppId,
      expect.objectContaining({
        status: "pending",
        final_amount_due: 1000,
        adjustment_amount: 0,
      })
    );
  });
});

describe("createFinancialFormForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("rejects form create when student payment phase is missing", async () => {
    vi.mocked(studentPaymentPhaseRepository.findSppById).mockResolvedValue({
      data: null,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    const result = await createFinancialFormForManager(
      adminClient,
      actor.userId,
      actor,
      {
        student_payment_phase_id: sppId,
        full_name: "Jane Student",
        school_or_university: null,
        date_of_birth: null,
        phone: null,
        parent_phone: null,
        current_gpa: null,
        received_financial_aid_before: false,
        certificates: null,
        family_members: null,
        working_family_members: null,
        total_family_income: null,
        children_currently_learning: null,
        has_deceased_parent: false,
        both_parents_work: false,
        family_hardship: false,
        family_chronic_disease: false,
        affordable_monthly_payment: null,
        student_works: false,
        student_monthly_income: null,
        agreed_to_rules: true,
      }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/student payment phase not found/i);
    }
  });

  it("allows multiple forms on the same student payment phase", async () => {
    mockOkLoad();
    vi.mocked(studentFinancialFormRepository.createForm).mockResolvedValue({
      data: formRecord,
      error: null,
      count: null,
      status: 201,
      statusText: "Created",
    } as never);

    const result = await createFinancialFormForManager(
      adminClient,
      actor.userId,
      actor,
      {
        student_payment_phase_id: sppId,
        full_name: "Jane Student",
        school_or_university: null,
        date_of_birth: null,
        phone: null,
        parent_phone: null,
        current_gpa: null,
        received_financial_aid_before: false,
        certificates: null,
        family_members: null,
        working_family_members: null,
        total_family_income: null,
        children_currently_learning: null,
        has_deceased_parent: false,
        both_parents_work: false,
        family_hardship: false,
        family_chronic_disease: false,
        affordable_monthly_payment: null,
        student_works: false,
        student_monthly_income: null,
        agreed_to_rules: true,
      }
    );

    expect(result.success).toBe(true);
    expect(studentFinancialFormRepository.createForm).toHaveBeenCalled();
  });
});

describe("createFinancialFormInviteForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("creates an invite with a public url", async () => {
    mockOkLoad();
    vi.mocked(
      studentFinancialFormInviteRepository.createInvite
    ).mockResolvedValue({
      data: inviteRecord,
      error: null,
      count: null,
      status: 201,
      statusText: "Created",
    } as never);

    const result = await createFinancialFormInviteForManager(
      adminClient,
      actor.userId,
      actor,
      { student_payment_phase_id: sppId }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.invite.token).toBe(inviteToken);
      expect(result.invite.url).toContain("/f/");
      expect(result.invite.is_used).toBe(false);
    }
  });
});

describe("deleteFinancialFormInviteForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("deletes an active invite", async () => {
    mockOkLoad();
    vi.mocked(
      studentFinancialFormInviteRepository.findInviteById
    ).mockResolvedValue({
      data: inviteRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      studentFinancialFormInviteRepository.deleteInvite
    ).mockResolvedValue({
      data: null,
      error: null,
      count: null,
      status: 204,
      statusText: "No Content",
    } as never);

    const result = await deleteFinancialFormInviteForManager(
      adminClient,
      actor.userId,
      actor,
      { id: inviteId, student_payment_phase_id: sppId }
    );

    expect(result.success).toBe(true);
    expect(studentFinancialFormInviteRepository.deleteInvite).toHaveBeenCalledWith(
      adminClient,
      inviteId
    );
  });

  it("rejects deleting a used invite", async () => {
    vi.mocked(
      studentFinancialFormInviteRepository.findInviteById
    ).mockResolvedValue({
      data: {
        ...inviteRecord,
        used_at: "2026-07-16T00:00:00.000Z",
        form_id: formId,
      },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    const result = await deleteFinancialFormInviteForManager(
      adminClient,
      actor.userId,
      actor,
      { id: inviteId, student_payment_phase_id: sppId }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Used invite links cannot be deleted.");
    }
    expect(
      studentFinancialFormInviteRepository.deleteInvite
    ).not.toHaveBeenCalled();
  });
});

describe("submitFinancialFormByToken", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(checkPublicFinancialFormSubmitRateLimit).mockResolvedValue({
      allowed: true,
    });
  });

  it("creates a form and marks the invite used", async () => {
    vi.mocked(
      studentFinancialFormInviteRepository.findInviteByToken
    ).mockResolvedValue({
      data: inviteRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    mockOkLoad();
    vi.mocked(studentFinancialFormRepository.createForm).mockResolvedValue({
      data: { ...formRecord, invite_id: inviteId },
      error: null,
      count: null,
      status: 201,
      statusText: "Created",
    } as never);
    vi.mocked(
      studentFinancialFormInviteRepository.markInviteUsed
    ).mockResolvedValue({
      data: {
        ...inviteRecord,
        used_at: "2026-07-16T00:00:00.000Z",
        form_id: formId,
      },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    const result = await submitFinancialFormByToken(adminClient, {
      token: inviteToken,
      full_name: "Jane Student",
      school_or_university: null,
      date_of_birth: null,
      phone: null,
      parent_phone: null,
      current_gpa: null,
      received_financial_aid_before: false,
      certificates: null,
      family_members: null,
      working_family_members: null,
      total_family_income: null,
      children_currently_learning: null,
      has_deceased_parent: false,
      both_parents_work: false,
      family_hardship: false,
      family_chronic_disease: false,
      affordable_monthly_payment: null,
      student_works: false,
      student_monthly_income: null,
      agreed_to_rules: true,
    });

    expect(result.success).toBe(true);
    expect(studentFinancialFormRepository.createForm).toHaveBeenCalled();
    expect(
      studentFinancialFormInviteRepository.markInviteUsed
    ).toHaveBeenCalled();
  });

  it("rejects a second submit on the same token", async () => {
    vi.mocked(
      studentFinancialFormInviteRepository.findInviteByToken
    ).mockResolvedValue({
      data: {
        ...inviteRecord,
        used_at: "2026-07-16T00:00:00.000Z",
        form_id: formId,
      },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    const result = await submitFinancialFormByToken(adminClient, {
      token: inviteToken,
      full_name: "Jane Student",
      school_or_university: null,
      date_of_birth: null,
      phone: null,
      parent_phone: null,
      current_gpa: null,
      received_financial_aid_before: false,
      certificates: null,
      family_members: null,
      working_family_members: null,
      total_family_income: null,
      children_currently_learning: null,
      has_deceased_parent: false,
      both_parents_work: false,
      family_hardship: false,
      family_chronic_disease: false,
      affordable_monthly_payment: null,
      student_works: false,
      student_monthly_income: null,
      agreed_to_rules: true,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/already been used/i);
    }
    expect(studentFinancialFormRepository.createForm).not.toHaveBeenCalled();
  });

  it("rejects submit when the student assignment is cancelled", async () => {
    vi.mocked(
      studentFinancialFormInviteRepository.findInviteByToken
    ).mockResolvedValue({
      data: inviteRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
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

    const result = await submitFinancialFormByToken(adminClient, {
      token: inviteToken,
      full_name: "Jane Student",
      school_or_university: null,
      date_of_birth: null,
      phone: null,
      parent_phone: null,
      current_gpa: null,
      received_financial_aid_before: false,
      certificates: null,
      family_members: null,
      working_family_members: null,
      total_family_income: null,
      children_currently_learning: null,
      has_deceased_parent: false,
      both_parents_work: false,
      family_hardship: false,
      family_chronic_disease: false,
      affordable_monthly_payment: null,
      student_works: false,
      student_monthly_income: null,
      agreed_to_rules: true,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/cancelled student assignment/i);
    }
  });
});

describe("updateAdjustmentForManager validation path", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("rejects percentage 150 at the service layer", async () => {
    const result = await updateAdjustmentForManager(
      adminClient,
      actor.userId,
      actor,
      {
        id: adjustmentId,
        student_payment_phase_id: sppId,
        type: "discount",
        value_type: "percentage",
        value: 150,
        effective_date: "2026-07-15",
      }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.value?.[0]).toMatch(/at most 100/i);
    }
  });
});
