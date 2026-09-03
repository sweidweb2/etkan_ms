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
import * as profileRepository from "@/repositories/profile.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import * as auditLogService from "@/services/ops/audit-log.service";
import type { AuditActor } from "@/services/ops/audit-log.service";
import {
  createAdjustmentForManager,
  createFinancialFormForManager,
  createFinancialFormInviteForManager,
  deleteAdjustmentForManager,
  deleteFinancialFormInviteForManager,
  getAdjustmentForSppForSelf,
  importAdjustmentForManager,
  listImportableAdjustmentsForManager,
  listOpenSppsMissingPriorAdjustmentForManager,
  submitFinancialFormByToken,
  updateAdjustmentForManager,
} from "@/services/accounting/student-financial-adjustment.service";
import {
  assertPermission,
  assertStudentSelfAccess,
} from "@/services/auth/authorization.service";

vi.mock("@/repositories/payment-phase.repository");
vi.mock("@/repositories/student-payment-phase.repository");
vi.mock("@/repositories/student-financial-adjustment.repository");
vi.mock("@/repositories/student-financial-form.repository");
vi.mock("@/repositories/student-financial-form-invite.repository");
vi.mock("@/repositories/profile.repository", () => ({
  findProfileById: vi.fn().mockResolvedValue({ data: { username: "jane" }, error: null }),
  listProfilesByIds: vi.fn().mockResolvedValue({
    data: [{ id: "student-1", username: "jane" }],
    error: null,
  }),
}));
vi.mock("@/repositories/student-profile.repository", () => ({
  listStudentProfilesByUserIds: vi.fn().mockResolvedValue({
    data: [{ id: "sp1", user_id: "student-1", full_name: "Jane Student" }],
    error: null,
  }),
}));
vi.mock("@/lib/manager/accounting/financial-form-invite-url", () => ({
  getFinancialFormInviteUrl: (token: string) =>
    `http://localhost:3000/f/${token}`,
}));
vi.mock("@/lib/rate-limit/public-financial-form-rate-limit");
vi.mock("@/lib/utils/local-iso-date", () => ({
  getLocalIsoDate: () => "2026-09-02",
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
  vi.mocked(studentPaymentPhaseRepository.findSppWithPhaseById).mockResolvedValue({
    data: { ...sppRecord, payment_phases: phaseRecord },
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
    vi.mocked(
      studentFinancialAdjustmentRepository.createAdjustmentWithRecalc
    ).mockResolvedValue({
      data: null,
      error: {
        message:
          "This student payment phase already has a financial adjustment.",
      },
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
    expect(auditLogService.recordManagerAuditLog).not.toHaveBeenCalled();
  });

  it("rejects adjustments when the phase is cancelled", async () => {
    vi.mocked(
      studentFinancialAdjustmentRepository.createAdjustmentWithRecalc
    ).mockResolvedValue({
      data: null,
      error: {
        message: "Cannot change adjustments on a cancelled payment phase.",
      },
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
    vi.mocked(
      studentFinancialAdjustmentRepository.createAdjustmentWithRecalc
    ).mockResolvedValue({
      data: null,
      error: {
        message:
          "Cannot change adjustments on a cancelled student assignment.",
      },
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

  it("creates a 100% scholarship via RPC and audits", async () => {
    vi.mocked(
      studentFinancialAdjustmentRepository.createAdjustmentWithRecalc
    ).mockResolvedValue({
      data: {
        adjustment: adjustmentRecord,
        previous: null,
        studentPaymentPhaseId: sppId,
        paymentPhaseId: phaseId,
      },
      error: null,
    } as never);

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
      studentFinancialAdjustmentRepository.createAdjustmentWithRecalc
    ).toHaveBeenCalled();
    expect(
      studentPaymentPhaseRepository.updateStudentPaymentPhaseFinancials
    ).not.toHaveBeenCalled();
    expect(
      paymentPhaseRepository.updatePaymentPhaseStatus
    ).not.toHaveBeenCalled();
    expect(auditLogService.recordManagerAuditLog).toHaveBeenCalled();
  });
});

describe("deleteAdjustmentForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("deletes an adjustment via RPC and audits", async () => {
    vi.mocked(
      studentFinancialAdjustmentRepository.deleteAdjustmentWithRecalc
    ).mockResolvedValue({
      data: {
        deleted: adjustmentRecord,
        studentPaymentPhaseId: sppId,
        paymentPhaseId: phaseId,
      },
      error: null,
    } as never);

    const result = await deleteAdjustmentForManager(
      adminClient,
      actor.userId,
      actor,
      { id: adjustmentId, student_payment_phase_id: sppId }
    );

    expect(result.success).toBe(true);
    expect(
      studentFinancialAdjustmentRepository.deleteAdjustmentWithRecalc
    ).toHaveBeenCalledWith(adminClient, adjustmentId, sppId);
    expect(
      studentPaymentPhaseRepository.updateStudentPaymentPhaseFinancials
    ).not.toHaveBeenCalled();
    expect(auditLogService.recordManagerAuditLog).toHaveBeenCalled();
  });
});

describe("createFinancialFormForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("rejects form create when student payment phase is missing", async () => {
    vi.mocked(studentPaymentPhaseRepository.findSppWithPhaseById).mockResolvedValue({
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
    mockOkLoad();
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
    vi.mocked(studentPaymentPhaseRepository.findSppWithPhaseById).mockResolvedValue({
      data: { ...sppRecord, status: "cancelled", payment_phases: phaseRecord },
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

describe("listImportableAdjustmentsForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("maps prior adjustments and skips malformed joins", async () => {
    const otherSppId = "44444444-4444-4444-8444-444444444444";
    const otherAdjustmentId = "88888888-8888-4888-8888-888888888888";

    vi.mocked(
      studentFinancialAdjustmentRepository.listAdjustmentsForStudentExcludingSpp
    ).mockResolvedValue({
      data: [
        {
          id: otherAdjustmentId,
          student_payment_phase_id: otherSppId,
          type: "discount",
          value_type: "fixed",
          value: 200,
          reason: "Sibling discount",
          effective_date: "2026-01-10",
          created_at: "2026-01-10T00:00:00.000Z",
          updated_at: "2026-01-10T00:00:00.000Z",
          student_payment_phases: {
            id: otherSppId,
            student_id: "student-1",
            status: "paid",
            payment_phases: {
              id: "phase-old",
              name: "Spring tuition",
              status: "closed",
            },
          },
        },
        {
          id: "bad-row",
          student_payment_phase_id: "bad-spp",
          type: "discount",
          value_type: "fixed",
          value: 1,
          reason: null,
          effective_date: "2026-01-01",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
          student_payment_phases: null,
        },
      ],
      error: null,
    } as never);

    const rows = await listImportableAdjustmentsForManager(
      adminClient,
      actor.userId,
      "student-1",
      sppId
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: otherAdjustmentId,
      source_spp_id: otherSppId,
      payment_phase_name: "Spring tuition",
      payment_phase_status: "closed",
      value: 200,
    });
  });

  it("returns empty when the student has no other adjustments", async () => {
    vi.mocked(
      studentFinancialAdjustmentRepository.listAdjustmentsForStudentExcludingSpp
    ).mockResolvedValue({ data: [], error: null } as never);

    const rows = await listImportableAdjustmentsForManager(
      adminClient,
      actor.userId,
      "student-1",
      sppId
    );

    expect(rows).toEqual([]);
  });
});

describe("importAdjustmentForManager", () => {
  const sourceSppId = "44444444-4444-4444-8444-444444444444";
  const sourceAdjustmentId = "88888888-8888-4888-8888-888888888888";
  const sourcePhaseId = "99999999-9999-4999-8999-999999999999";

  const sourceAdjustment = {
    id: sourceAdjustmentId,
    student_payment_phase_id: sourceSppId,
    type: "scholarship",
    value_type: "percentage",
    value: 50,
    reason: "Need-based",
    effective_date: "2026-01-15",
    created_at: "2026-01-15T00:00:00.000Z",
    updated_at: "2026-01-15T00:00:00.000Z",
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("copies type/value/reason onto the target SPP with today's effective date", async () => {
    vi.mocked(studentPaymentPhaseRepository.findSppWithPhaseById)
      .mockResolvedValueOnce({
        data: { ...sppRecord, payment_phases: phaseRecord },
        error: null,
      } as never)
      .mockResolvedValueOnce({
        data: {
          ...sppRecord,
          id: sourceSppId,
          payment_phase_id: sourcePhaseId,
          payment_phases: {
            ...phaseRecord,
            id: sourcePhaseId,
            name: "Spring tuition",
            status: "closed",
          },
        },
        error: null,
      } as never);

    vi.mocked(
      studentFinancialAdjustmentRepository.findAdjustmentBySppId
    ).mockResolvedValue({ data: null, error: null } as never);
    vi.mocked(
      studentFinancialAdjustmentRepository.findAdjustmentById
    ).mockResolvedValue({ data: sourceAdjustment, error: null } as never);
    vi.mocked(
      studentFinancialAdjustmentRepository.createAdjustmentWithRecalc
    ).mockResolvedValue({
      data: {
        adjustment: {
          ...sourceAdjustment,
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          student_payment_phase_id: sppId,
          effective_date: "2026-09-02",
        },
        previous: null,
        studentPaymentPhaseId: sppId,
        paymentPhaseId: phaseId,
      },
      error: null,
    } as never);

    const result = await importAdjustmentForManager(
      adminClient,
      actor.userId,
      actor,
      {
        target_student_payment_phase_id: sppId,
        source_adjustment_id: sourceAdjustmentId,
      }
    );

    expect(result.success).toBe(true);
    expect(
      studentFinancialAdjustmentRepository.createAdjustmentWithRecalc
    ).toHaveBeenCalledWith(adminClient, {
      student_payment_phase_id: sppId,
      type: "scholarship",
      value_type: "percentage",
      value: 50,
      reason: "Need-based",
      effective_date: "2026-09-02",
    });
    expect(auditLogService.recordManagerAuditLog).toHaveBeenCalledWith(
      adminClient,
      actor,
      expect.objectContaining({
        metadata: expect.objectContaining({
          source_adjustment_id: sourceAdjustmentId,
        }),
      })
    );
    if (result.success) {
      expect(result.message).toMatch(/imported/i);
      expect(result.adjustment.effective_date).toBe("2026-09-02");
    }
  });

  it("rejects when the target already has an adjustment", async () => {
    mockOkLoad();
    vi.mocked(
      studentFinancialAdjustmentRepository.findAdjustmentBySppId
    ).mockResolvedValue({ data: adjustmentRecord, error: null } as never);

    const result = await importAdjustmentForManager(
      adminClient,
      actor.userId,
      actor,
      {
        target_student_payment_phase_id: sppId,
        source_adjustment_id: sourceAdjustmentId,
      }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/already has a financial adjustment/i);
    }
  });

  it("rejects a source adjustment from a different student", async () => {
    vi.mocked(studentPaymentPhaseRepository.findSppWithPhaseById)
      .mockResolvedValueOnce({
        data: { ...sppRecord, payment_phases: phaseRecord },
        error: null,
      } as never)
      .mockResolvedValueOnce({
        data: {
          ...sppRecord,
          id: sourceSppId,
          student_id: "student-other",
          payment_phase_id: sourcePhaseId,
          payment_phases: {
            ...phaseRecord,
            id: sourcePhaseId,
          },
        },
        error: null,
      } as never);

    vi.mocked(
      studentFinancialAdjustmentRepository.findAdjustmentBySppId
    ).mockResolvedValue({ data: null, error: null } as never);
    vi.mocked(
      studentFinancialAdjustmentRepository.findAdjustmentById
    ).mockResolvedValue({ data: sourceAdjustment, error: null } as never);

    const result = await importAdjustmentForManager(
      adminClient,
      actor.userId,
      actor,
      {
        target_student_payment_phase_id: sppId,
        source_adjustment_id: sourceAdjustmentId,
      }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/does not belong to this student/i);
    }
    expect(
      studentFinancialAdjustmentRepository.createAdjustmentWithRecalc
    ).not.toHaveBeenCalled();
  });
});

describe("listOpenSppsMissingPriorAdjustmentForManager", () => {
  const openedPhase = {
    id: phaseId,
    name: "Fall tuition",
    semester_id: "66666666-6666-4666-8666-666666666666",
    semester_name: "Fall",
    status: "opened" as const,
  };
  const otherOpenPhaseId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const otherOpenSppId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(profileRepository.listProfilesByIds).mockResolvedValue({
      data: [{ id: "student-1", username: "jane" }],
      error: null,
    } as never);
    vi.mocked(
      studentProfileRepository.listStudentProfilesByUserIds
    ).mockResolvedValue({
      data: [{ id: "sp1", user_id: "student-1", full_name: "Jane Student" }],
      error: null,
    } as never);
  });

  it("includes open SPPs without adjustment when the student has a prior one", async () => {
    vi.mocked(
      studentPaymentPhaseRepository.listSppsByPaymentPhaseIds
    ).mockResolvedValue({
      data: [{ id: sppId, payment_phase_id: phaseId, status: "pending", student_id: "student-1" }],
      error: null,
    } as never);
    vi.mocked(
      studentFinancialAdjustmentRepository.listAdjustmentsBySppIds
    ).mockResolvedValue({ data: [], error: null } as never);
    vi.mocked(
      studentFinancialAdjustmentRepository.listStudentIdsWithAdjustmentsExcludingSppIds
    ).mockResolvedValue({ data: ["student-1"], error: null });

    const rows = await listOpenSppsMissingPriorAdjustmentForManager(
      adminClient,
      actor.userId,
      [openedPhase]
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      spp_id: sppId,
      student_label: "Jane Student",
      payment_phase_name: "Fall tuition",
      student_profile_id: "sp1",
    });
  });

  it("excludes SPPs that already have an adjustment", async () => {
    vi.mocked(
      studentPaymentPhaseRepository.listSppsByPaymentPhaseIds
    ).mockResolvedValue({
      data: [{ id: sppId, payment_phase_id: phaseId, status: "pending", student_id: "student-1" }],
      error: null,
    } as never);
    vi.mocked(
      studentFinancialAdjustmentRepository.listAdjustmentsBySppIds
    ).mockResolvedValue({
      data: [{ student_payment_phase_id: sppId, value_type: "fixed", value: 100 }],
      error: null,
    } as never);

    const rows = await listOpenSppsMissingPriorAdjustmentForManager(
      adminClient,
      actor.userId,
      [openedPhase]
    );

    expect(rows).toEqual([]);
    expect(
      studentFinancialAdjustmentRepository.listStudentIdsWithAdjustmentsExcludingSppIds
    ).not.toHaveBeenCalled();
  });

  it("excludes when the student has no prior adjustment on another SPP", async () => {
    vi.mocked(
      studentPaymentPhaseRepository.listSppsByPaymentPhaseIds
    ).mockResolvedValue({
      data: [{ id: sppId, payment_phase_id: phaseId, status: "pending", student_id: "student-1" }],
      error: null,
    } as never);
    vi.mocked(
      studentFinancialAdjustmentRepository.listAdjustmentsBySppIds
    ).mockResolvedValue({ data: [], error: null } as never);
    vi.mocked(
      studentFinancialAdjustmentRepository.listStudentIdsWithAdjustmentsExcludingSppIds
    ).mockResolvedValue({ data: [], error: null });

    const rows = await listOpenSppsMissingPriorAdjustmentForManager(
      adminClient,
      actor.userId,
      [openedPhase]
    );

    expect(rows).toEqual([]);
  });

  it("excludes cancelled SPPs on opened phases", async () => {
    vi.mocked(
      studentPaymentPhaseRepository.listSppsByPaymentPhaseIds
    ).mockResolvedValue({
      data: [
        {
          id: sppId,
          payment_phase_id: phaseId,
          status: "cancelled",
          student_id: "student-1",
        },
      ],
      error: null,
    } as never);

    const rows = await listOpenSppsMissingPriorAdjustmentForManager(
      adminClient,
      actor.userId,
      [openedPhase]
    );

    expect(rows).toEqual([]);
  });

  it("returns one row per qualifying open SPP for the same student", async () => {
    vi.mocked(
      studentPaymentPhaseRepository.listSppsByPaymentPhaseIds
    ).mockResolvedValue({
      data: [
        {
          id: sppId,
          payment_phase_id: phaseId,
          status: "pending",
          student_id: "student-1",
        },
        {
          id: otherOpenSppId,
          payment_phase_id: otherOpenPhaseId,
          status: "partially_paid",
          student_id: "student-1",
        },
      ],
      error: null,
    } as never);
    vi.mocked(
      studentFinancialAdjustmentRepository.listAdjustmentsBySppIds
    ).mockResolvedValue({ data: [], error: null } as never);
    vi.mocked(
      studentFinancialAdjustmentRepository.listStudentIdsWithAdjustmentsExcludingSppIds
    ).mockResolvedValue({ data: ["student-1"], error: null });

    const rows = await listOpenSppsMissingPriorAdjustmentForManager(
      adminClient,
      actor.userId,
      [
        openedPhase,
        {
          id: otherOpenPhaseId,
          name: "Workshop fees",
          semester_id: openedPhase.semester_id,
          semester_name: "Fall",
          status: "opened",
        },
      ]
    );

    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.spp_id).sort()).toEqual(
      [sppId, otherOpenSppId].sort()
    );
    expect(
      studentFinancialAdjustmentRepository.listStudentIdsWithAdjustmentsExcludingSppIds
    ).toHaveBeenCalledWith(
      adminClient,
      ["student-1"],
      expect.arrayContaining([sppId, otherOpenSppId])
    );
  });
});

describe("getAdjustmentForSppForSelf", () => {
  const studentUserId = "student-1";

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

  it("returns adjustment for owned SPP", async () => {
    vi.mocked(studentPaymentPhaseRepository.findSppById).mockResolvedValue({
      data: sppRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      studentFinancialAdjustmentRepository.findAdjustmentBySppId
    ).mockResolvedValue({
      data: adjustmentRecord,
      error: null,
    } as never);

    const row = await getAdjustmentForSppForSelf(
      adminClient,
      studentUserId,
      sppId
    );

    expect(row?.id).toBe(adjustmentId);
  });

  it("returns null for another student's SPP", async () => {
    vi.mocked(studentPaymentPhaseRepository.findSppById).mockResolvedValue({
      data: { ...sppRecord, student_id: "other-student" },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    const row = await getAdjustmentForSppForSelf(
      adminClient,
      studentUserId,
      sppId
    );

    expect(row).toBeNull();
    expect(
      studentFinancialAdjustmentRepository.findAdjustmentBySppId
    ).not.toHaveBeenCalled();
  });
});
