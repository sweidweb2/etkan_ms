import {
  FINANCIAL_ADJUSTMENT_TYPES,
  FINANCIAL_ADJUSTMENT_TYPE_VALUES,
  FINANCIAL_ADJUSTMENT_VALUE_TYPES,
  FINANCIAL_ADJUSTMENT_VALUE_TYPE_VALUES,
  PAYMENT_PHASE_STATUSES,
  STUDENT_PAYMENT_PHASE_STATUSES,
  type FinancialAdjustmentType,
  type FinancialAdjustmentValueType,
} from "@/lib/manager/accounting/constants";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getLocalIsoDate } from "@/lib/utils/local-iso-date";
import {
  createFinancialAdjustmentSchema,
  updateFinancialAdjustmentSchema,
} from "@/lib/validators/manager/create-financial-adjustment";
import { importFinancialAdjustmentSchema } from "@/lib/validators/manager/import-financial-adjustment";
import { deleteFinancialAdjustmentSchema } from "@/lib/validators/manager/delete-financial-adjustment";
import { deleteFinancialFormSchema } from "@/lib/validators/manager/delete-financial-form";
import { deleteFinancialFormInviteSchema } from "@/lib/validators/manager/delete-financial-form-invite";
import {
  createFinancialFormInviteSchema,
  createFinancialFormSchema,
  submitPublicFinancialFormSchema,
  updateFinancialFormSchema,
} from "@/lib/validators/manager/upsert-financial-form";
import { getFinancialFormInviteUrl } from "@/lib/manager/accounting/financial-form-invite-url";
import { checkPublicFinancialFormSubmitRateLimit } from "@/lib/rate-limit/public-financial-form-rate-limit";
import type { PaymentPhaseListRecord } from "@/repositories/payment-phase.repository";
import type {
  AdjustmentWithSourceSppRecord,
  FinancialAdjustmentRecord,
} from "@/repositories/student-financial-adjustment.repository";
import * as adjustmentRepository from "@/repositories/student-financial-adjustment.repository";
import type { FinancialFormInviteRecord } from "@/repositories/student-financial-form-invite.repository";
import * as inviteRepository from "@/repositories/student-financial-form-invite.repository";
import type { FinancialFormRecord } from "@/repositories/student-financial-form.repository";
import * as formRepository from "@/repositories/student-financial-form.repository";
import type { StudentPaymentPhaseRecord } from "@/repositories/student-payment-phase.repository";
import * as studentPaymentPhaseRepository from "@/repositories/student-payment-phase.repository";
import * as profileRepository from "@/repositories/profile.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import {
  assertPermission,
  getUnauthorizedError,
} from "@/services/auth/authorization.service";
import type { FieldErrors } from "@/types/auth";
import type {
  ManagerFinancialAdjustmentRow,
  ManagerFinancialFormInviteRow,
  ManagerFinancialFormRow,
  ManagerImportableAdjustmentRow,
  PublicFinancialFormInviteContext,
} from "@/types/manager-financial-adjustment";
import { randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

type MutationSuccessBase = {
  success: true;
  message: string;
  student_payment_phase_id: string;
  payment_phase_id: string;
};

type MutationFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type GetAdjustmentResult = ManagerFinancialAdjustmentRow | null;

export type GetImportableAdjustmentsResult = ManagerImportableAdjustmentRow[];

export type GetFormsResult = ManagerFinancialFormRow[];

export type GetInvitesResult = ManagerFinancialFormInviteRow[];

export type CreateAdjustmentResult =
  | (MutationSuccessBase & { adjustment: ManagerFinancialAdjustmentRow })
  | MutationFailure;

export type ImportAdjustmentResult = CreateAdjustmentResult;

export type UpdateAdjustmentResult =
  | (MutationSuccessBase & { adjustment: ManagerFinancialAdjustmentRow })
  | MutationFailure;

export type DeleteAdjustmentResult = MutationSuccessBase | MutationFailure;

export type UpsertFormResult =
  | (MutationSuccessBase & { form: ManagerFinancialFormRow })
  | MutationFailure;

export type DeleteFormResult = MutationSuccessBase | MutationFailure;

export type CreateInviteResult =
  | (MutationSuccessBase & { invite: ManagerFinancialFormInviteRow })
  | MutationFailure;

export type DeleteInviteResult = MutationSuccessBase | MutationFailure;

export type PublicSubmitFormResult =
  | { success: true; message: string }
  | MutationFailure;

function isAdjustmentType(value: string): value is FinancialAdjustmentType {
  return (FINANCIAL_ADJUSTMENT_TYPE_VALUES as readonly string[]).includes(value);
}

function isValueType(value: string): value is FinancialAdjustmentValueType {
  return (FINANCIAL_ADJUSTMENT_VALUE_TYPE_VALUES as readonly string[]).includes(
    value
  );
}

function normalizeOptionalString(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function assertMutationsAllowed(
  phaseStatus: string | null | undefined,
  sppStatus: string | null | undefined
): string | null {
  if (phaseStatus === PAYMENT_PHASE_STATUSES.CANCELLED) {
    return "Cannot change adjustments on a cancelled payment phase.";
  }
  if (sppStatus === STUDENT_PAYMENT_PHASE_STATUSES.CANCELLED) {
    return "Cannot change adjustments on a cancelled student assignment.";
  }
  return null;
}

function mapAdjustmentWriteError(
  message: string,
  fallback: string
): MutationFailure {
  const known = [
    "Student payment phase not found.",
    "Unable to load payment phase.",
    "Unable to load student payment phase.",
    "Cannot change adjustments on a cancelled payment phase.",
    "Cannot change adjustments on a cancelled student assignment.",
    "This student payment phase already has a financial adjustment.",
    "Adjustment not found.",
    "Adjustment does not belong to this student payment phase.",
  ];

  for (const item of known) {
    if (message.includes(item)) {
      return { success: false, error: item };
    }
  }

  return { success: false, error: fallback };
}

function mapFormRecord(record: FinancialFormRecord): ManagerFinancialFormRow {
  return {
    id: record.id,
    student_payment_phase_id: record.student_payment_phase_id,
    invite_id: record.invite_id,
    full_name: record.full_name,
    school_or_university: record.school_or_university,
    date_of_birth: record.date_of_birth,
    phone: record.phone,
    parent_phone: record.parent_phone,
    current_gpa: record.current_gpa,
    received_financial_aid_before: Boolean(record.received_financial_aid_before),
    certificates: record.certificates,
    family_members: record.family_members,
    working_family_members: record.working_family_members,
    total_family_income:
      record.total_family_income === null
        ? null
        : Number(record.total_family_income),
    children_currently_learning: record.children_currently_learning,
    has_deceased_parent: Boolean(record.has_deceased_parent),
    both_parents_work: Boolean(record.both_parents_work),
    family_hardship: Boolean(record.family_hardship),
    family_chronic_disease: Boolean(record.family_chronic_disease),
    affordable_monthly_payment:
      record.affordable_monthly_payment === null
        ? null
        : Number(record.affordable_monthly_payment),
    student_works: Boolean(record.student_works),
    student_monthly_income:
      record.student_monthly_income === null
        ? null
        : Number(record.student_monthly_income),
    agreed_to_rules: Boolean(record.agreed_to_rules),
    created_at: record.created_at,
  };
}

function mapInviteRecord(
  record: FinancialFormInviteRecord
): ManagerFinancialFormInviteRow {
  return {
    id: record.id,
    student_payment_phase_id: record.student_payment_phase_id,
    token: record.token,
    url: getFinancialFormInviteUrl(record.token),
    created_by: record.created_by,
    created_at: record.created_at,
    used_at: record.used_at,
    form_id: record.form_id,
    is_used: record.used_at !== null,
  };
}

function mapAdjustmentRecord(
  record: FinancialAdjustmentRecord
): ManagerFinancialAdjustmentRow {
  return {
    id: record.id,
    student_payment_phase_id: record.student_payment_phase_id,
    type: isAdjustmentType(record.type)
      ? record.type
      : FINANCIAL_ADJUSTMENT_TYPES.DISCOUNT,
    value_type: isValueType(record.value_type)
      ? record.value_type
      : FINANCIAL_ADJUSTMENT_VALUE_TYPES.FIXED,
    value: Number(record.value),
    reason: record.reason,
    effective_date: record.effective_date,
    created_at: record.created_at,
  };
}

function mapImportableAdjustmentRecord(
  record: AdjustmentWithSourceSppRecord
): ManagerImportableAdjustmentRow | null {
  const spp = record.student_payment_phases;
  if (!spp || Array.isArray(spp)) {
    return null;
  }

  const phase = spp.payment_phases;
  if (!phase || Array.isArray(phase)) {
    return null;
  }

  return {
    id: record.id,
    type: isAdjustmentType(record.type)
      ? record.type
      : FINANCIAL_ADJUSTMENT_TYPES.DISCOUNT,
    value_type: isValueType(record.value_type)
      ? record.value_type
      : FINANCIAL_ADJUSTMENT_VALUE_TYPES.FIXED,
    value: Number(record.value),
    reason: record.reason,
    effective_date: record.effective_date,
    created_at: record.created_at,
    source_spp_id: spp.id,
    source_spp_status: spp.status,
    payment_phase_id: phase.id,
    payment_phase_name: phase.name,
    payment_phase_status: phase.status,
  };
}

async function loadSppAndPhase(
  adminClient: Supabase,
  sppId: string
): Promise<
  | { spp: StudentPaymentPhaseRecord; phase: PaymentPhaseListRecord }
  | { error: string }
> {
  const { data, error } =
    await studentPaymentPhaseRepository.findSppWithPhaseById(adminClient, sppId);

  if (error) {
    return { error: "Unable to load student payment phase." };
  }

  if (!data) {
    return { error: "Student payment phase not found." };
  }

  const phase = data.payment_phases;
  if (!phase || Array.isArray(phase)) {
    return { error: "Unable to load payment phase." };
  }

  const { payment_phases: _paymentPhase, ...spp } = data;

  return {
    spp: spp as StudentPaymentPhaseRecord,
    phase: phase as PaymentPhaseListRecord,
  };
}

export async function getAdjustmentForSppForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  sppId: string
): Promise<GetAdjustmentResult> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.ACCOUNTING_VIEW
  );

  const { data: adjustment, error } =
    await adjustmentRepository.findAdjustmentBySppId(adminClient, sppId);

  if (error) {
    throw new Error(error.message);
  }

  if (!adjustment) {
    return null;
  }

  return mapAdjustmentRecord(adjustment as FinancialAdjustmentRecord);
}

export async function listImportableAdjustmentsForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  studentId: string,
  excludeSppId: string
): Promise<GetImportableAdjustmentsResult> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.ACCOUNTING_VIEW
  );

  const { data, error } =
    await adjustmentRepository.listAdjustmentsForStudentExcludingSpp(
      adminClient,
      studentId,
      excludeSppId
    );

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data as AdjustmentWithSourceSppRecord[] | null) ?? [];
  return rows
    .map(mapImportableAdjustmentRecord)
    .filter((row): row is ManagerImportableAdjustmentRow => row !== null);
}

export async function listFormsForSppForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  sppId: string
): Promise<GetFormsResult> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.ACCOUNTING_VIEW
  );

  const { data: forms, error } = await formRepository.listFormsBySppId(
    adminClient,
    sppId
  );

  if (error) {
    throw new Error(error.message);
  }

  return ((forms as FinancialFormRecord[] | null) ?? []).map(mapFormRecord);
}

export async function listInvitesForSppForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  sppId: string
): Promise<GetInvitesResult> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.ACCOUNTING_VIEW
  );

  const { data: invites, error } = await inviteRepository.listInvitesBySppId(
    adminClient,
    sppId
  );

  if (error) {
    throw new Error(error.message);
  }

  return ((invites as FinancialFormInviteRecord[] | null) ?? []).map(
    mapInviteRecord
  );
}

export async function createAdjustmentForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    student_payment_phase_id: string;
    type: string;
    value_type: string;
    value: number;
    reason?: string | null;
    effective_date: string;
  }
): Promise<CreateAdjustmentResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.ACCOUNTING_ADJUSTMENTS_CREATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = createFinancialAdjustmentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { data, error: createError } =
    await adjustmentRepository.createAdjustmentWithRecalc(adminClient, {
      student_payment_phase_id: parsed.data.student_payment_phase_id,
      type: parsed.data.type,
      value_type: parsed.data.value_type,
      value: parsed.data.value,
      reason: normalizeOptionalString(parsed.data.reason),
      effective_date: parsed.data.effective_date,
    });

  if (createError) {
    return mapAdjustmentWriteError(
      createError.message,
      "Unable to create adjustment. Please try again."
    );
  }

  if (!data?.adjustment || !data.studentPaymentPhaseId || !data.paymentPhaseId) {
    return {
      success: false,
      error: "Unable to create adjustment. Please try again.",
    };
  }

  const created = data.adjustment;

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "info",
    table_name: "student_financial_adjustments",
    record_id: created.id,
    new_data: {
      student_payment_phase_id: created.student_payment_phase_id,
      type: created.type,
      value_type: created.value_type,
      value: created.value,
      effective_date: created.effective_date,
    },
    metadata: { note: "Financial adjustment created." },
  });

  return {
    success: true,
    message: "Financial adjustment created.",
    adjustment: mapAdjustmentRecord(created),
    student_payment_phase_id: data.studentPaymentPhaseId,
    payment_phase_id: data.paymentPhaseId,
  };
}

export async function importAdjustmentForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    target_student_payment_phase_id: string;
    source_adjustment_id: string;
  }
): Promise<ImportAdjustmentResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.ACCOUNTING_ADJUSTMENTS_CREATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = importFinancialAdjustmentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const targetLoaded = await loadSppAndPhase(
    adminClient,
    parsed.data.target_student_payment_phase_id
  );
  if ("error" in targetLoaded) {
    return { success: false, error: targetLoaded.error };
  }

  const mutationBlocked = assertMutationsAllowed(
    targetLoaded.phase.status,
    targetLoaded.spp.status
  );
  if (mutationBlocked) {
    return { success: false, error: mutationBlocked };
  }

  const { data: existingAdjustment, error: existingError } =
    await adjustmentRepository.findAdjustmentBySppId(
      adminClient,
      parsed.data.target_student_payment_phase_id
    );
  if (existingError) {
    return {
      success: false,
      error: "Unable to import adjustment. Please try again.",
    };
  }
  if (existingAdjustment) {
    return {
      success: false,
      error: "This student payment phase already has a financial adjustment.",
    };
  }

  const { data: sourceAdjustment, error: sourceError } =
    await adjustmentRepository.findAdjustmentById(
      adminClient,
      parsed.data.source_adjustment_id
    );
  if (sourceError) {
    return {
      success: false,
      error: "Unable to import adjustment. Please try again.",
    };
  }
  if (!sourceAdjustment) {
    return { success: false, error: "Adjustment not found." };
  }

  const sourceLoaded = await loadSppAndPhase(
    adminClient,
    sourceAdjustment.student_payment_phase_id
  );
  if ("error" in sourceLoaded) {
    return { success: false, error: "Adjustment not found." };
  }

  if (sourceLoaded.spp.student_id !== targetLoaded.spp.student_id) {
    return {
      success: false,
      error: "Source adjustment does not belong to this student.",
    };
  }

  if (
    sourceAdjustment.student_payment_phase_id ===
    parsed.data.target_student_payment_phase_id
  ) {
    return {
      success: false,
      error: "Cannot import an adjustment from the same student payment phase.",
    };
  }

  const { data, error: createError } =
    await adjustmentRepository.createAdjustmentWithRecalc(adminClient, {
      student_payment_phase_id: parsed.data.target_student_payment_phase_id,
      type: sourceAdjustment.type,
      value_type: sourceAdjustment.value_type,
      value: Number(sourceAdjustment.value),
      reason: normalizeOptionalString(sourceAdjustment.reason),
      effective_date: getLocalIsoDate(),
    });

  if (createError) {
    return mapAdjustmentWriteError(
      createError.message,
      "Unable to import adjustment. Please try again."
    );
  }

  if (!data?.adjustment || !data.studentPaymentPhaseId || !data.paymentPhaseId) {
    return {
      success: false,
      error: "Unable to import adjustment. Please try again.",
    };
  }

  const created = data.adjustment;

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "info",
    table_name: "student_financial_adjustments",
    record_id: created.id,
    new_data: {
      student_payment_phase_id: created.student_payment_phase_id,
      type: created.type,
      value_type: created.value_type,
      value: created.value,
      effective_date: created.effective_date,
    },
    metadata: {
      note: "Financial adjustment imported from prior SPP.",
      source_adjustment_id: sourceAdjustment.id,
      source_student_payment_phase_id:
        sourceAdjustment.student_payment_phase_id,
    },
  });

  return {
    success: true,
    message: "Financial adjustment imported.",
    adjustment: mapAdjustmentRecord(created),
    student_payment_phase_id: data.studentPaymentPhaseId,
    payment_phase_id: data.paymentPhaseId,
  };
}

export async function updateAdjustmentForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    id: string;
    student_payment_phase_id: string;
    type: string;
    value_type: string;
    value: number;
    reason?: string | null;
    effective_date: string;
  }
): Promise<UpdateAdjustmentResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.ACCOUNTING_ADJUSTMENTS_UPDATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = updateFinancialAdjustmentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { data, error: updateError } =
    await adjustmentRepository.updateAdjustmentWithRecalc(adminClient, {
      id: parsed.data.id,
      student_payment_phase_id: parsed.data.student_payment_phase_id,
      type: parsed.data.type,
      value_type: parsed.data.value_type,
      value: parsed.data.value,
      reason: normalizeOptionalString(parsed.data.reason),
      effective_date: parsed.data.effective_date,
    });

  if (updateError) {
    return mapAdjustmentWriteError(
      updateError.message,
      "Unable to update adjustment. Please try again."
    );
  }

  if (!data?.adjustment || !data.studentPaymentPhaseId || !data.paymentPhaseId) {
    return {
      success: false,
      error: "Unable to update adjustment. Please try again.",
    };
  }

  const updated = data.adjustment;
  const existing = data.previous;

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "student_financial_adjustments",
    record_id: updated.id,
    old_data: existing
      ? {
          type: existing.type,
          value_type: existing.value_type,
          value: existing.value,
          effective_date: existing.effective_date,
        }
      : null,
    new_data: {
      type: updated.type,
      value_type: updated.value_type,
      value: updated.value,
      effective_date: updated.effective_date,
    },
    metadata: { note: "Financial adjustment updated." },
  });

  return {
    success: true,
    message: "Financial adjustment updated.",
    adjustment: mapAdjustmentRecord(updated),
    student_payment_phase_id: data.studentPaymentPhaseId,
    payment_phase_id: data.paymentPhaseId,
  };
}

export async function deleteAdjustmentForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: { id: string; student_payment_phase_id?: string }
): Promise<DeleteAdjustmentResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.ACCOUNTING_ADJUSTMENTS_DELETE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = deleteFinancialAdjustmentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { data, error: deleteError } =
    await adjustmentRepository.deleteAdjustmentWithRecalc(
      adminClient,
      parsed.data.id,
      parsed.data.student_payment_phase_id
    );

  if (deleteError) {
    return mapAdjustmentWriteError(
      deleteError.message,
      "Unable to delete adjustment. Please try again."
    );
  }

  if (!data?.deleted || !data.studentPaymentPhaseId || !data.paymentPhaseId) {
    return {
      success: false,
      error: "Unable to delete adjustment. Please try again.",
    };
  }

  const existing = data.deleted;

  await recordManagerAuditLog(adminClient, actor, {
    action: "delete",
    severity: "warning",
    table_name: "student_financial_adjustments",
    record_id: existing.id,
    old_data: {
      student_payment_phase_id: existing.student_payment_phase_id,
      type: existing.type,
      value_type: existing.value_type,
      value: existing.value,
    },
    metadata: { note: "Financial adjustment deleted." },
  });

  return {
    success: true,
    message: "Financial adjustment deleted.",
    student_payment_phase_id: data.studentPaymentPhaseId,
    payment_phase_id: data.paymentPhaseId,
  };
}

export async function createFinancialFormForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: CreateFinancialFormInputLike
): Promise<UpsertFormResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.ACCOUNTING_ADJUSTMENTS_UPDATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = createFinancialFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const loaded = await loadSppAndPhase(
    adminClient,
    parsed.data.student_payment_phase_id
  );
  if ("error" in loaded) {
    return { success: false, error: loaded.error };
  }

  const blocked = assertMutationsAllowed(loaded.phase.status, loaded.spp.status);
  if (blocked) {
    return { success: false, error: blocked };
  }

  const { data: created, error: createError } = await formRepository.createForm(
    adminClient,
    {
      ...parsed.data,
      invite_id: null,
      school_or_university: parsed.data.school_or_university,
      date_of_birth: parsed.data.date_of_birth,
      phone: parsed.data.phone,
      parent_phone: parsed.data.parent_phone,
      current_gpa: parsed.data.current_gpa,
      certificates: parsed.data.certificates,
    }
  );

  if (createError || !created) {
    return {
      success: false,
      error: "Unable to create financial form. Please try again.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "info",
    table_name: "student_financial_forms",
    record_id: created.id,
    new_data: {
      student_payment_phase_id: created.student_payment_phase_id,
      full_name: created.full_name,
    },
    metadata: { note: "Financial form created." },
  });

  return {
    success: true,
    message: "Financial form saved.",
    form: mapFormRecord(created as FinancialFormRecord),
    student_payment_phase_id: loaded.spp.id,
    payment_phase_id: loaded.spp.payment_phase_id,
  };
}

type CreateFinancialFormInputLike = {
  student_payment_phase_id: string;
  full_name: string;
  school_or_university?: string | null;
  date_of_birth?: string | null;
  phone?: string | null;
  parent_phone?: string | null;
  current_gpa?: string | null;
  received_financial_aid_before: boolean;
  certificates?: string | null;
  family_members?: number | null;
  working_family_members?: number | null;
  total_family_income?: number | null;
  children_currently_learning?: number | null;
  has_deceased_parent: boolean;
  both_parents_work: boolean;
  family_hardship: boolean;
  family_chronic_disease: boolean;
  affordable_monthly_payment?: number | null;
  student_works: boolean;
  student_monthly_income?: number | null;
  agreed_to_rules: boolean;
};

export async function updateFinancialFormForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: CreateFinancialFormInputLike & { id: string }
): Promise<UpsertFormResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.ACCOUNTING_ADJUSTMENTS_UPDATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = updateFinancialFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const [existingResult, loaded] = await Promise.all([
    formRepository.findFormById(adminClient, parsed.data.id),
    loadSppAndPhase(adminClient, parsed.data.student_payment_phase_id),
  ]);

  if (existingResult.error || !existingResult.data) {
    return { success: false, error: "Financial form not found." };
  }

  const existing = existingResult.data;

  if (existing.student_payment_phase_id !== parsed.data.student_payment_phase_id) {
    return {
      success: false,
      error: "Form does not belong to this student payment phase.",
    };
  }

  if ("error" in loaded) {
    return { success: false, error: loaded.error };
  }

  const blocked = assertMutationsAllowed(loaded.phase.status, loaded.spp.status);
  if (blocked) {
    return { success: false, error: blocked };
  }

  const { data: updated, error: updateError } = await formRepository.updateForm(
    adminClient,
    parsed.data.id,
    {
      full_name: parsed.data.full_name,
      school_or_university: parsed.data.school_or_university,
      date_of_birth: parsed.data.date_of_birth,
      phone: parsed.data.phone,
      parent_phone: parsed.data.parent_phone,
      current_gpa: parsed.data.current_gpa,
      received_financial_aid_before: parsed.data.received_financial_aid_before,
      certificates: parsed.data.certificates,
      family_members: parsed.data.family_members,
      working_family_members: parsed.data.working_family_members,
      total_family_income: parsed.data.total_family_income,
      children_currently_learning: parsed.data.children_currently_learning,
      has_deceased_parent: parsed.data.has_deceased_parent,
      both_parents_work: parsed.data.both_parents_work,
      family_hardship: parsed.data.family_hardship,
      family_chronic_disease: parsed.data.family_chronic_disease,
      affordable_monthly_payment: parsed.data.affordable_monthly_payment,
      student_works: parsed.data.student_works,
      student_monthly_income: parsed.data.student_monthly_income,
      agreed_to_rules: parsed.data.agreed_to_rules,
    }
  );

  if (updateError || !updated) {
    return {
      success: false,
      error: "Unable to update financial form. Please try again.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "student_financial_forms",
    record_id: updated.id,
    old_data: { full_name: existing.full_name },
    new_data: { full_name: updated.full_name },
    metadata: { note: "Financial form updated." },
  });

  return {
    success: true,
    message: "Financial form updated.",
    form: mapFormRecord(updated as FinancialFormRecord),
    student_payment_phase_id: loaded.spp.id,
    payment_phase_id: loaded.spp.payment_phase_id,
  };
}

export async function deleteFinancialFormForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: { id: string; student_payment_phase_id: string }
): Promise<DeleteFormResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.ACCOUNTING_ADJUSTMENTS_DELETE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = deleteFinancialFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const [existingResult, loaded] = await Promise.all([
    formRepository.findFormById(adminClient, parsed.data.id),
    loadSppAndPhase(adminClient, parsed.data.student_payment_phase_id),
  ]);

  if (existingResult.error || !existingResult.data) {
    return { success: false, error: "Financial form not found." };
  }

  const existing = existingResult.data;

  if (existing.student_payment_phase_id !== parsed.data.student_payment_phase_id) {
    return {
      success: false,
      error: "Form does not belong to this student payment phase.",
    };
  }

  if ("error" in loaded) {
    return { success: false, error: loaded.error };
  }

  const blocked = assertMutationsAllowed(loaded.phase.status, loaded.spp.status);
  if (blocked) {
    return { success: false, error: blocked };
  }

  const { error: deleteError } = await formRepository.deleteForm(
    adminClient,
    existing.id
  );

  if (deleteError) {
    return {
      success: false,
      error: "Unable to delete financial form. Please try again.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "delete",
    severity: "warning",
    table_name: "student_financial_forms",
    record_id: existing.id,
    old_data: {
      student_payment_phase_id: existing.student_payment_phase_id,
      full_name: existing.full_name,
      invite_id: existing.invite_id,
    },
    metadata: { note: "Financial form deleted." },
  });

  return {
    success: true,
    message: "Financial form deleted.",
    student_payment_phase_id: loaded.spp.id,
    payment_phase_id: loaded.spp.payment_phase_id,
  };
}

export async function createFinancialFormInviteForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: { student_payment_phase_id: string }
): Promise<CreateInviteResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.ACCOUNTING_ADJUSTMENTS_UPDATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = createFinancialFormInviteSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const loaded = await loadSppAndPhase(
    adminClient,
    parsed.data.student_payment_phase_id
  );
  if ("error" in loaded) {
    return { success: false, error: loaded.error };
  }

  const blocked = assertMutationsAllowed(loaded.phase.status, loaded.spp.status);
  if (blocked) {
    return { success: false, error: blocked };
  }

  const token = randomBytes(32).toString("base64url");
  const { data: created, error: createError } = await inviteRepository.createInvite(
    adminClient,
    {
      student_payment_phase_id: loaded.spp.id,
      token,
      created_by: actor.userId,
    }
  );

  if (createError || !created) {
    return {
      success: false,
      error: "Unable to create invite link. Please try again.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "info",
    table_name: "student_financial_form_invites",
    record_id: created.id,
    new_data: {
      student_payment_phase_id: created.student_payment_phase_id,
    },
    metadata: { note: "Financial form invite created." },
  });

  return {
    success: true,
    message: "Invite link created.",
    invite: mapInviteRecord(created as FinancialFormInviteRecord),
    student_payment_phase_id: loaded.spp.id,
    payment_phase_id: loaded.spp.payment_phase_id,
  };
}

export async function deleteFinancialFormInviteForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: { id: string; student_payment_phase_id: string }
): Promise<DeleteInviteResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.ACCOUNTING_ADJUSTMENTS_DELETE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = deleteFinancialFormInviteSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const [existingResult, loaded] = await Promise.all([
    inviteRepository.findInviteById(adminClient, parsed.data.id),
    loadSppAndPhase(adminClient, parsed.data.student_payment_phase_id),
  ]);

  if (existingResult.error || !existingResult.data) {
    return { success: false, error: "Invite link not found." };
  }

  const existing = existingResult.data;

  if (existing.student_payment_phase_id !== parsed.data.student_payment_phase_id) {
    return {
      success: false,
      error: "Invite does not belong to this student payment phase.",
    };
  }

  if (existing.used_at !== null) {
    return {
      success: false,
      error: "Used invite links cannot be deleted.",
    };
  }

  if ("error" in loaded) {
    return { success: false, error: loaded.error };
  }

  const blocked = assertMutationsAllowed(loaded.phase.status, loaded.spp.status);
  if (blocked) {
    return { success: false, error: blocked };
  }

  const { error: deleteError } = await inviteRepository.deleteInvite(
    adminClient,
    existing.id
  );

  if (deleteError) {
    return {
      success: false,
      error: "Unable to delete invite link. Please try again.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "delete",
    severity: "warning",
    table_name: "student_financial_form_invites",
    record_id: existing.id,
    old_data: {
      student_payment_phase_id: existing.student_payment_phase_id,
      created_at: existing.created_at,
    },
    metadata: { note: "Financial form invite deleted." },
  });

  return {
    success: true,
    message: "Invite link deleted.",
    student_payment_phase_id: loaded.spp.id,
    payment_phase_id: loaded.spp.payment_phase_id,
  };
}

async function resolvePublicStudentLabel(
  adminClient: Supabase,
  studentId: string
): Promise<string> {
  const [{ data: profile }, { data: studentProfiles }] = await Promise.all([
    profileRepository.findProfileById(adminClient, studentId),
    studentProfileRepository.listStudentProfilesByUserIds(adminClient, [
      studentId,
    ]),
  ]);

  const fullName = studentProfiles?.[0]?.full_name?.trim();
  const username = profile?.username?.trim();
  return fullName || username || "Student";
}

export async function getInviteFormContextByToken(
  adminClient: Supabase,
  token: string
): Promise<PublicFinancialFormInviteContext | null> {
  const { data: invite, error } = await inviteRepository.findInviteByToken(
    adminClient,
    token
  );

  if (error) {
    throw new Error(error.message);
  }

  if (!invite) {
    return null;
  }

  const loaded = await loadSppAndPhase(
    adminClient,
    invite.student_payment_phase_id
  );
  if ("error" in loaded) {
    return null;
  }

  const student_label = await resolvePublicStudentLabel(
    adminClient,
    loaded.spp.student_id
  );

  return {
    token: invite.token,
    student_label,
    payment_phase_name: loaded.phase.name,
    is_used: invite.used_at !== null,
  };
}

export async function submitFinancialFormByToken(
  adminClient: Supabase,
  input: {
    token: string;
    full_name: string;
    school_or_university?: string | null;
    date_of_birth?: string | null;
    phone?: string | null;
    parent_phone?: string | null;
    current_gpa?: string | null;
    received_financial_aid_before: boolean;
    certificates?: string | null;
    family_members?: number | null;
    working_family_members?: number | null;
    total_family_income?: number | null;
    children_currently_learning?: number | null;
    has_deceased_parent: boolean;
    both_parents_work: boolean;
    family_hardship: boolean;
    family_chronic_disease: boolean;
    affordable_monthly_payment?: number | null;
    student_works: boolean;
    student_monthly_income?: number | null;
    agreed_to_rules: boolean;
  }
): Promise<PublicSubmitFormResult> {
  const rateLimit = await checkPublicFinancialFormSubmitRateLimit(input.token);
  if (!rateLimit.allowed) {
    return { success: false, error: rateLimit.message };
  }

  const parsed = submitPublicFinancialFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { data: invite, error: inviteError } =
    await inviteRepository.findInviteByToken(adminClient, parsed.data.token);

  if (inviteError) {
    return {
      success: false,
      error: "Unable to submit form. Please try again.",
    };
  }

  if (!invite) {
    return { success: false, error: "This link is no longer valid." };
  }

  if (invite.used_at) {
    return {
      success: false,
      error: "This link has already been used.",
    };
  }

  const loaded = await loadSppAndPhase(
    adminClient,
    invite.student_payment_phase_id
  );
  if ("error" in loaded) {
    return { success: false, error: loaded.error };
  }

  const blocked = assertMutationsAllowed(loaded.phase.status, loaded.spp.status);
  if (blocked) {
    return { success: false, error: blocked };
  }

  const { data: created, error: createError } = await formRepository.createForm(
    adminClient,
    {
      student_payment_phase_id: loaded.spp.id,
      invite_id: invite.id,
      full_name: parsed.data.full_name,
      school_or_university: parsed.data.school_or_university,
      date_of_birth: parsed.data.date_of_birth,
      phone: parsed.data.phone,
      parent_phone: parsed.data.parent_phone,
      current_gpa: parsed.data.current_gpa,
      received_financial_aid_before: parsed.data.received_financial_aid_before,
      certificates: parsed.data.certificates,
      family_members: parsed.data.family_members,
      working_family_members: parsed.data.working_family_members,
      total_family_income: parsed.data.total_family_income,
      children_currently_learning: parsed.data.children_currently_learning,
      has_deceased_parent: parsed.data.has_deceased_parent,
      both_parents_work: parsed.data.both_parents_work,
      family_hardship: parsed.data.family_hardship,
      family_chronic_disease: parsed.data.family_chronic_disease,
      affordable_monthly_payment: parsed.data.affordable_monthly_payment,
      student_works: parsed.data.student_works,
      student_monthly_income: parsed.data.student_monthly_income,
      agreed_to_rules: parsed.data.agreed_to_rules,
    }
  );

  if (createError || !created) {
    return {
      success: false,
      error: "Unable to submit form. Please try again.",
    };
  }

  const usedAt = new Date().toISOString();
  const { data: marked, error: markError } = await inviteRepository.markInviteUsed(
    adminClient,
    invite.id,
    created.id,
    usedAt
  );

  if (markError || !marked) {
    return {
      success: false,
      error: "This link has already been used.",
    };
  }

  return {
    success: true,
    message: "Financial form submitted successfully.",
  };
}
