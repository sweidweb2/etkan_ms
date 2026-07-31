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
import {
  createFinancialAdjustmentSchema,
  updateFinancialAdjustmentSchema,
} from "@/lib/validators/manager/create-financial-adjustment";
import { deleteFinancialAdjustmentSchema } from "@/lib/validators/manager/delete-financial-adjustment";
import {
  createFinancialFormSchema,
  updateFinancialFormSchema,
} from "@/lib/validators/manager/upsert-financial-form";
import type { PaymentPhaseListRecord } from "@/repositories/payment-phase.repository";
import * as paymentPhaseRepository from "@/repositories/payment-phase.repository";
import type { FinancialAdjustmentRecord } from "@/repositories/student-financial-adjustment.repository";
import * as adjustmentRepository from "@/repositories/student-financial-adjustment.repository";
import type { FinancialFormRecord } from "@/repositories/student-financial-form.repository";
import * as formRepository from "@/repositories/student-financial-form.repository";
import type { StudentPaymentPhaseRecord } from "@/repositories/student-payment-phase.repository";
import * as studentPaymentPhaseRepository from "@/repositories/student-payment-phase.repository";
import { recalcSppAndPhaseStatus } from "@/services/accounting-recalc.service";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/audit-log.service";
import {
  assertPermission,
  getUnauthorizedError,
} from "@/services/authorization.service";
import type { FieldErrors } from "@/types/auth";
import type {
  ManagerFinancialAdjustmentRow,
  ManagerFinancialFormRow,
} from "@/types/manager-financial-adjustment";
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

export type CreateAdjustmentResult =
  | (MutationSuccessBase & { adjustment: ManagerFinancialAdjustmentRow })
  | MutationFailure;

export type UpdateAdjustmentResult =
  | (MutationSuccessBase & { adjustment: ManagerFinancialAdjustmentRow })
  | MutationFailure;

export type DeleteAdjustmentResult = MutationSuccessBase | MutationFailure;

export type UpsertFormResult =
  | (MutationSuccessBase & { form: ManagerFinancialFormRow })
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

function mapFormRecord(record: FinancialFormRecord): ManagerFinancialFormRow {
  return {
    id: record.id,
    student_financial_adjustment_id: record.student_financial_adjustment_id,
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

function mapAdjustmentRecord(
  record: FinancialAdjustmentRecord,
  form: FinancialFormRecord | null
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
    form: form ? mapFormRecord(form) : null,
  };
}

async function loadSppAndPhase(
  adminClient: Supabase,
  sppId: string
): Promise<
  | { spp: StudentPaymentPhaseRecord; phase: PaymentPhaseListRecord }
  | { error: string }
> {
  const { data: spp, error: sppError } =
    await studentPaymentPhaseRepository.findSppById(adminClient, sppId);

  if (sppError) {
    return { error: "Unable to load student payment phase." };
  }

  if (!spp) {
    return { error: "Student payment phase not found." };
  }

  const { data: phase, error: phaseError } =
    await paymentPhaseRepository.findPaymentPhaseById(
      adminClient,
      spp.payment_phase_id
    );

  if (phaseError || !phase) {
    return { error: "Unable to load payment phase." };
  }

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

  const { data: form, error: formError } =
    await formRepository.findFormByAdjustmentId(adminClient, adjustment.id);

  if (formError) {
    throw new Error(formError.message);
  }

  return mapAdjustmentRecord(
    adjustment as FinancialAdjustmentRecord,
    (form as FinancialFormRecord | null) ?? null
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

  const { data: existing } = await adjustmentRepository.findAdjustmentBySppId(
    adminClient,
    parsed.data.student_payment_phase_id
  );
  if (existing) {
    return {
      success: false,
      error: "This student payment phase already has a financial adjustment.",
    };
  }

  const { data: created, error: createError } =
    await adjustmentRepository.createAdjustment(adminClient, {
      student_payment_phase_id: parsed.data.student_payment_phase_id,
      type: parsed.data.type,
      value_type: parsed.data.value_type,
      value: parsed.data.value,
      reason: normalizeOptionalString(parsed.data.reason),
      effective_date: parsed.data.effective_date,
    });

  if (createError || !created) {
    const message = createError?.message?.toLowerCase() ?? "";
    if (message.includes("unique") || message.includes("duplicate")) {
      return {
        success: false,
        error: "This student payment phase already has a financial adjustment.",
      };
    }
    return {
      success: false,
      error: "Unable to create adjustment. Please try again.",
    };
  }

  try {
    await recalcSppAndPhaseStatus(adminClient, loaded.spp.id);
  } catch {
    return {
      success: false,
      error: "Adjustment created, but balances could not be recalculated.",
    };
  }

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
    adjustment: mapAdjustmentRecord(created as FinancialAdjustmentRecord, null),
    student_payment_phase_id: loaded.spp.id,
    payment_phase_id: loaded.spp.payment_phase_id,
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

  const { data: existing, error: existingError } =
    await adjustmentRepository.findAdjustmentById(adminClient, parsed.data.id);

  if (existingError) {
    return {
      success: false,
      error: "Unable to update adjustment. Please try again.",
    };
  }

  if (!existing) {
    return { success: false, error: "Adjustment not found." };
  }

  if (
    existing.student_payment_phase_id !== parsed.data.student_payment_phase_id
  ) {
    return {
      success: false,
      error: "Adjustment does not belong to this student payment phase.",
    };
  }

  const loaded = await loadSppAndPhase(
    adminClient,
    existing.student_payment_phase_id
  );
  if ("error" in loaded) {
    return { success: false, error: loaded.error };
  }

  const blocked = assertMutationsAllowed(loaded.phase.status, loaded.spp.status);
  if (blocked) {
    return { success: false, error: blocked };
  }

  const { data: updated, error: updateError } =
    await adjustmentRepository.updateAdjustment(adminClient, parsed.data.id, {
      type: parsed.data.type,
      value_type: parsed.data.value_type,
      value: parsed.data.value,
      reason: normalizeOptionalString(parsed.data.reason),
      effective_date: parsed.data.effective_date,
    });

  if (updateError || !updated) {
    return {
      success: false,
      error: "Unable to update adjustment. Please try again.",
    };
  }

  try {
    await recalcSppAndPhaseStatus(adminClient, loaded.spp.id);
  } catch {
    return {
      success: false,
      error: "Adjustment updated, but balances could not be recalculated.",
    };
  }

  const { data: form } = await formRepository.findFormByAdjustmentId(
    adminClient,
    updated.id
  );

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "student_financial_adjustments",
    record_id: updated.id,
    old_data: {
      type: existing.type,
      value_type: existing.value_type,
      value: existing.value,
      effective_date: existing.effective_date,
    },
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
    adjustment: mapAdjustmentRecord(
      updated as FinancialAdjustmentRecord,
      (form as FinancialFormRecord | null) ?? null
    ),
    student_payment_phase_id: loaded.spp.id,
    payment_phase_id: loaded.spp.payment_phase_id,
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

  const { data: existing, error: existingError } =
    await adjustmentRepository.findAdjustmentById(adminClient, parsed.data.id);

  if (existingError) {
    return {
      success: false,
      error: "Unable to delete adjustment. Please try again.",
    };
  }

  if (!existing) {
    return { success: false, error: "Adjustment not found." };
  }

  if (
    parsed.data.student_payment_phase_id &&
    parsed.data.student_payment_phase_id !== existing.student_payment_phase_id
  ) {
    return {
      success: false,
      error: "Adjustment does not belong to this student payment phase.",
    };
  }

  const loaded = await loadSppAndPhase(
    adminClient,
    existing.student_payment_phase_id
  );
  if ("error" in loaded) {
    return { success: false, error: loaded.error };
  }

  const blocked = assertMutationsAllowed(loaded.phase.status, loaded.spp.status);
  if (blocked) {
    return { success: false, error: blocked };
  }

  const { error: deleteError } = await adjustmentRepository.deleteAdjustment(
    adminClient,
    existing.id
  );

  if (deleteError) {
    return {
      success: false,
      error: "Unable to delete adjustment. Please try again.",
    };
  }

  try {
    await recalcSppAndPhaseStatus(adminClient, loaded.spp.id);
  } catch {
    return {
      success: false,
      error: "Adjustment deleted, but balances could not be recalculated.",
    };
  }

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
    student_payment_phase_id: loaded.spp.id,
    payment_phase_id: loaded.spp.payment_phase_id,
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

  const { data: adjustment, error: adjustmentError } =
    await adjustmentRepository.findAdjustmentById(
      adminClient,
      parsed.data.student_financial_adjustment_id
    );

  if (adjustmentError || !adjustment) {
    return { success: false, error: "Financial adjustment not found." };
  }

  const loaded = await loadSppAndPhase(
    adminClient,
    adjustment.student_payment_phase_id
  );
  if ("error" in loaded) {
    return { success: false, error: loaded.error };
  }

  const blocked = assertMutationsAllowed(loaded.phase.status, loaded.spp.status);
  if (blocked) {
    return { success: false, error: blocked };
  }

  const { data: existingForm } = await formRepository.findFormByAdjustmentId(
    adminClient,
    adjustment.id
  );
  if (existingForm) {
    return {
      success: false,
      error: "This adjustment already has a financial form.",
    };
  }

  const { data: created, error: createError } = await formRepository.createForm(
    adminClient,
    {
      ...parsed.data,
      school_or_university: parsed.data.school_or_university,
      date_of_birth: parsed.data.date_of_birth,
      phone: parsed.data.phone,
      parent_phone: parsed.data.parent_phone,
      current_gpa: parsed.data.current_gpa,
      certificates: parsed.data.certificates,
    }
  );

  if (createError || !created) {
    const message = createError?.message?.toLowerCase() ?? "";
    if (message.includes("unique") || message.includes("duplicate")) {
      return {
        success: false,
        error: "This adjustment already has a financial form.",
      };
    }
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
      student_financial_adjustment_id: created.student_financial_adjustment_id,
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
  student_financial_adjustment_id: string;
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

  const { data: existing, error: existingError } =
    await formRepository.findFormById(adminClient, parsed.data.id);

  if (existingError || !existing) {
    return { success: false, error: "Financial form not found." };
  }

  if (
    existing.student_financial_adjustment_id !==
    parsed.data.student_financial_adjustment_id
  ) {
    return {
      success: false,
      error: "Form does not belong to this adjustment.",
    };
  }

  const { data: adjustment, error: adjustmentError } =
    await adjustmentRepository.findAdjustmentById(
      adminClient,
      existing.student_financial_adjustment_id
    );

  if (adjustmentError || !adjustment) {
    return { success: false, error: "Financial adjustment not found." };
  }

  const loaded = await loadSppAndPhase(
    adminClient,
    adjustment.student_payment_phase_id
  );
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
