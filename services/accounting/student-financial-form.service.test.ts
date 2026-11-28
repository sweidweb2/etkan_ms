import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/constants/permissions";
import * as semesterDropRequestRepository from "@/repositories/semester-drop-request.repository";
import * as studentFinancialFormInviteRepository from "@/repositories/student-financial-form-invite.repository";
import * as studentFinancialFormRepository from "@/repositories/student-financial-form.repository";
import * as studentPaymentPhaseRepository from "@/repositories/student-payment-phase.repository";
import * as authorizationService from "@/services/auth/authorization.service";
import * as auditLogService from "@/services/ops/audit-log.service";
import type { AuditActor } from "@/services/ops/audit-log.service";
import {
  createFinancialFormForManager,
  createFinancialFormInviteForManager,
  deleteFinancialFormForManager,
  deleteFinancialFormInviteForManager,
  updateFinancialFormForManager,
} from "@/services/accounting/student-financial-form.service";

vi.mock("@/repositories/semester-drop-request.repository");
vi.mock("@/repositories/student-payment-phase.repository");
vi.mock("@/repositories/student-financial-form.repository");
vi.mock("@/repositories/student-financial-form-invite.repository");
vi.mock("@/lib/manager/accounting/financial-form-invite-url", () => ({
  getFinancialFormInviteUrl: (token: string) =>
    `http://localhost:3000/f/${token}`,
}));
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

const phaseId = "22222222-2222-4222-8222-222222222222";
const sppId = "33333333-3333-4333-8333-333333333333";
const formId = "66666666-6666-4666-8666-666666666666";
const otherSppId = "44444444-4444-4444-8444-444444444444";
const inviteId = "77777777-7777-4777-8777-777777777777";

const phaseRecord = {
  id: phaseId,
  name: "Fall tuition",
  semester_id: "55555555-5555-4555-8555-555555555555",
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
    id: "55555555-5555-4555-8555-555555555555",
    name: "Fall",
    semester_code: "F26",
  },
};

const sppRecord = {
  id: sppId,
  student_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
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
  token: "test-invite-token-abcdefghijklmnopqrstuvwxyz",
  created_by: actor.userId,
  created_at: "2026-07-15T00:00:00.000Z",
  used_at: null,
  form_id: null,
};

const validFormInput = {
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
};

function mockNoCompletedDrop() {
  vi.mocked(
    semesterDropRequestRepository.findCompletedDropBySppId
  ).mockResolvedValue({
    data: null,
    error: null,
  } as never);
}

function mockOkLoad(overrides?: {
  phaseStatus?: string;
  sppStatus?: string;
  dropCompleted?: boolean;
}) {
  mockNoCompletedDrop();
  if (overrides?.dropCompleted) {
    vi.mocked(
      semesterDropRequestRepository.findCompletedDropBySppId
    ).mockResolvedValue({
      data: { id: "drop-1" },
      error: null,
    } as never);
  }
  vi.mocked(studentPaymentPhaseRepository.findSppWithPhaseById).mockResolvedValue({
    data: {
      ...sppRecord,
      status: overrides?.sppStatus ?? sppRecord.status,
      payment_phases: {
        ...phaseRecord,
        status: overrides?.phaseStatus ?? phaseRecord.status,
      },
    },
    error: null,
    count: null,
    status: 200,
    statusText: "OK",
  } as never);
}

describe("student-financial-form.service authz", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(authorizationService.getUnauthorizedError).mockImplementation(
      async (_c, userId) => (userId ? null : "Unauthorized.")
    );
  });

  it("denies create form without actor and checks UPDATE permission", async () => {
    const result = await createFinancialFormForManager(
      adminClient,
      null,
      actor,
      validFormInput
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Unauthorized.");
    }
    expect(authorizationService.getUnauthorizedError).toHaveBeenCalledWith(
      adminClient,
      null,
      PERMISSIONS.ACCOUNTING_ADJUSTMENTS_UPDATE
    );
  });

  it("denies update form without actor and checks UPDATE permission", async () => {
    const result = await updateFinancialFormForManager(
      adminClient,
      null,
      actor,
      { ...validFormInput, id: formId }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Unauthorized.");
    }
    expect(authorizationService.getUnauthorizedError).toHaveBeenCalledWith(
      adminClient,
      null,
      PERMISSIONS.ACCOUNTING_ADJUSTMENTS_UPDATE
    );
  });

  it("denies delete form without actor and checks DELETE permission", async () => {
    const result = await deleteFinancialFormForManager(
      adminClient,
      null,
      actor,
      { id: formId, student_payment_phase_id: sppId }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Unauthorized.");
    }
    expect(authorizationService.getUnauthorizedError).toHaveBeenCalledWith(
      adminClient,
      null,
      PERMISSIONS.ACCOUNTING_ADJUSTMENTS_DELETE
    );
  });

  it("denies create invite without actor and checks UPDATE permission", async () => {
    const result = await createFinancialFormInviteForManager(
      adminClient,
      null,
      actor,
      { student_payment_phase_id: sppId }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Unauthorized.");
    }
    expect(authorizationService.getUnauthorizedError).toHaveBeenCalledWith(
      adminClient,
      null,
      PERMISSIONS.ACCOUNTING_ADJUSTMENTS_UPDATE
    );
  });

  it("denies delete invite without actor and checks DELETE permission", async () => {
    const result = await deleteFinancialFormInviteForManager(
      adminClient,
      null,
      actor,
      { id: inviteId, student_payment_phase_id: sppId }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Unauthorized.");
    }
    expect(authorizationService.getUnauthorizedError).toHaveBeenCalledWith(
      adminClient,
      null,
      PERMISSIONS.ACCOUNTING_ADJUSTMENTS_DELETE
    );
  });
});

describe("updateFinancialFormForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(authorizationService.getUnauthorizedError).mockResolvedValue(null);
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
    mockOkLoad();
  });

  it("updates a form and audits", async () => {
    vi.mocked(studentFinancialFormRepository.findFormById).mockResolvedValue({
      data: formRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(studentFinancialFormRepository.updateForm).mockResolvedValue({
      data: { ...formRecord, full_name: "Updated Name" },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    const result = await updateFinancialFormForManager(
      adminClient,
      actor.userId,
      actor,
      { ...validFormInput, id: formId, full_name: "Updated Name" }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.form.full_name).toBe("Updated Name");
      expect(result.message).toMatch(/updated/i);
    }
    expect(studentFinancialFormRepository.updateForm).toHaveBeenCalledWith(
      adminClient,
      formId,
      expect.objectContaining({ full_name: "Updated Name" })
    );
    expect(auditLogService.recordManagerAuditLog).toHaveBeenCalled();
  });

  it("rejects when form belongs to a different SPP", async () => {
    vi.mocked(studentFinancialFormRepository.findFormById).mockResolvedValue({
      data: { ...formRecord, student_payment_phase_id: otherSppId },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    const result = await updateFinancialFormForManager(
      adminClient,
      actor.userId,
      actor,
      { ...validFormInput, id: formId }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/does not belong/i);
    }
    expect(studentFinancialFormRepository.updateForm).not.toHaveBeenCalled();
  });
});

describe("deleteFinancialFormForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(authorizationService.getUnauthorizedError).mockResolvedValue(null);
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
    mockOkLoad();
  });

  it("deletes a form and audits", async () => {
    vi.mocked(studentFinancialFormRepository.findFormById).mockResolvedValue({
      data: formRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(studentFinancialFormRepository.deleteForm).mockResolvedValue({
      data: null,
      error: null,
      count: null,
      status: 204,
      statusText: "No Content",
    } as never);

    const result = await deleteFinancialFormForManager(
      adminClient,
      actor.userId,
      actor,
      { id: formId, student_payment_phase_id: sppId }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.message).toMatch(/deleted/i);
      expect(result.student_payment_phase_id).toBe(sppId);
    }
    expect(studentFinancialFormRepository.deleteForm).toHaveBeenCalledWith(
      adminClient,
      formId
    );
    expect(auditLogService.recordManagerAuditLog).toHaveBeenCalled();
  });
});

describe("financial form mutation locks", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(authorizationService.getUnauthorizedError).mockResolvedValue(null);
  });

  it("rejects create when the payment phase is cancelled", async () => {
    mockOkLoad({ phaseStatus: "cancelled" });

    const result = await createFinancialFormForManager(
      adminClient,
      actor.userId,
      actor,
      validFormInput
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/cancelled payment phase/i);
    }
    expect(studentFinancialFormRepository.createForm).not.toHaveBeenCalled();
  });

  it("rejects create when the student assignment is cancelled", async () => {
    mockOkLoad({ sppStatus: "cancelled" });

    const result = await createFinancialFormForManager(
      adminClient,
      actor.userId,
      actor,
      validFormInput
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/cancelled student assignment/i);
    }
    expect(studentFinancialFormRepository.createForm).not.toHaveBeenCalled();
  });

  it("rejects create when a semester drop is completed", async () => {
    mockOkLoad({ dropCompleted: true });

    const result = await createFinancialFormForManager(
      adminClient,
      actor.userId,
      actor,
      validFormInput
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/completed semester drop/i);
    }
    expect(studentFinancialFormRepository.createForm).not.toHaveBeenCalled();
  });
});

describe("financial form validation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(authorizationService.getUnauthorizedError).mockResolvedValue(null);
  });

  it("returns fieldErrors when full_name is empty", async () => {
    const result = await createFinancialFormForManager(
      adminClient,
      actor.userId,
      actor,
      { ...validFormInput, full_name: "" }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Please fix the errors below.");
      expect(result.fieldErrors?.full_name?.[0]).toMatch(/required/i);
    }
    expect(
      studentPaymentPhaseRepository.findSppWithPhaseById
    ).not.toHaveBeenCalled();
  });
});
