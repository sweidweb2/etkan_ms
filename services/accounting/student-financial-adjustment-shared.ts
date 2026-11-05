import "server-only";

import {
  FINANCIAL_ADJUSTMENT_TYPES,
  FINANCIAL_ADJUSTMENT_TYPE_VALUES,
  FINANCIAL_ADJUSTMENT_VALUE_TYPES,
  FINANCIAL_ADJUSTMENT_VALUE_TYPE_VALUES,
  STUDENT_PAYMENT_PHASE_STATUSES,
  type FinancialAdjustmentType,
  type FinancialAdjustmentValueType,
} from "@/lib/manager/accounting/constants";
import { getFinancialFormInviteUrl } from "@/lib/manager/accounting/financial-form-invite-url";
import {
  adjustmentBlockedMessage,
  SPP_ADJUSTMENT_LOCK_MESSAGES,
} from "@/lib/manager/accounting/semester-drop-messages";
import type { PaymentPhaseListRecord } from "@/repositories/payment-phase.repository";
import type {
  AdjustmentWithSourceSppRecord,
  FinancialAdjustmentRecord,
} from "@/repositories/student-financial-adjustment.repository";
import type { FinancialFormInviteRecord } from "@/repositories/student-financial-form-invite.repository";
import type { FinancialFormRecord } from "@/repositories/student-financial-form.repository";
import type { StudentPaymentPhaseRecord } from "@/repositories/student-payment-phase.repository";
import * as studentPaymentPhaseRepository from "@/repositories/student-payment-phase.repository";
import * as semesterDropRequestRepository from "@/repositories/semester-drop-request.repository";
import type {
  ManagerFinancialAdjustmentRow,
  ManagerFinancialFormInviteRow,
  ManagerFinancialFormRow,
  ManagerImportableAdjustmentRow,
} from "@/types/manager-financial-adjustment";
import type { MutationFailure, Supabase } from "@/services/shared/mutation";
import type { ManagerSppFinancialSnapshot } from "@/types/manager-student-payment";

export type MutationSuccessBase = {
  success: true;
  message: string;
  student_payment_phase_id: string;
  payment_phase_id: string;
};

export type AdjustmentMutationSuccess = MutationSuccessBase & {
  spp: ManagerSppFinancialSnapshot;
};

export function isAdjustmentType(value: string): value is FinancialAdjustmentType {
  return (FINANCIAL_ADJUSTMENT_TYPE_VALUES as readonly string[]).includes(value);
}

export function isValueType(value: string): value is FinancialAdjustmentValueType {
  return (FINANCIAL_ADJUSTMENT_VALUE_TYPE_VALUES as readonly string[]).includes(
    value
  );
}

export function normalizeOptionalString(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function assertMutationsAllowed(
  phaseStatus: string | null | undefined,
  sppStatus: string | null | undefined,
  dropCompleted = false
): string | null {
  return adjustmentBlockedMessage({
    phaseStatus,
    sppStatus,
    dropCompleted,
  });
}

export function mapAdjustmentWriteError(
  message: string,
  fallback: string
): MutationFailure {
  const known = [
    "Student payment phase not found.",
    "Unable to load payment phase.",
    "Unable to load student payment phase.",
    SPP_ADJUSTMENT_LOCK_MESSAGES.PHASE_CANCELLED,
    SPP_ADJUSTMENT_LOCK_MESSAGES.SPP_CANCELLED,
    SPP_ADJUSTMENT_LOCK_MESSAGES.DROP_COMPLETED,
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

export function mapFormRecord(record: FinancialFormRecord): ManagerFinancialFormRow {
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

export function mapInviteRecord(
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

export function mapAdjustmentRecord(
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

export function mapImportableAdjustmentRecord(
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

export function mapSppRecordToFinancialSnapshot(
  record: StudentPaymentPhaseRecord
): ManagerSppFinancialSnapshot {
  const statusValues = STUDENT_PAYMENT_PHASE_STATUSES;
  const status =
    record.status === statusValues.PENDING ||
    record.status === statusValues.PARTIALLY_PAID ||
    record.status === statusValues.PAID ||
    record.status === statusValues.CANCELLED
      ? record.status
      : statusValues.PENDING;

  return {
    id: record.id,
    status,
    original_amount: Number(record.original_amount),
    adjustment_amount: Number(record.adjustment_amount),
    final_amount_due: Number(record.final_amount_due),
    total_paid: Number(record.total_paid),
    remaining_amount: Number(record.remaining_amount),
  };
}

/**
 * Snapshot from the RPC-returned SPP row when present; otherwise one
 * `findSppById` read (DBs without the `spp` field in write RPC results).
 */
export async function loadSppFinancialSnapshot(
  adminClient: Supabase,
  sppId: string,
  returnedSpp?: StudentPaymentPhaseRecord | null
): Promise<
  { spp: ManagerSppFinancialSnapshot } | { error: string }
> {
  if (returnedSpp) {
    return { spp: mapSppRecordToFinancialSnapshot(returnedSpp) };
  }

  const result = await studentPaymentPhaseRepository.findSppById(
    adminClient,
    sppId
  );
  const data = result?.data;
  const error = result?.error;
  if (error || !data) {
    return {
      error: error?.message ?? "Unable to load updated student balance.",
    };
  }
  return {
    spp: mapSppRecordToFinancialSnapshot(data as StudentPaymentPhaseRecord),
  };
}

export async function loadSppAndPhase(
  adminClient: Supabase,
  sppId: string
): Promise<
  | {
      spp: StudentPaymentPhaseRecord;
      phase: PaymentPhaseListRecord;
      dropCompleted: boolean;
    }
  | { error: string }
> {
  const [{ data, error }, completedDropResult] = await Promise.all([
    studentPaymentPhaseRepository.findSppWithPhaseById(adminClient, sppId),
    semesterDropRequestRepository.findCompletedDropBySppId(adminClient, sppId),
  ]);

  if (error) {
    return { error: "Unable to load student payment phase." };
  }

  if (!data) {
    return { error: "Student payment phase not found." };
  }

  if (completedDropResult.error) {
    return { error: "Unable to load student payment phase." };
  }

  const phase = data.payment_phases;
  if (!phase || Array.isArray(phase)) {
    return { error: "Unable to load payment phase." };
  }

  const { payment_phases: _paymentPhase, ...spp } = data;

  return {
    spp: spp as StudentPaymentPhaseRecord,
    phase: phase as PaymentPhaseListRecord,
    dropCompleted: Boolean(completedDropResult.data),
  };
}
