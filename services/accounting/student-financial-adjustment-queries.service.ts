import "server-only";

import { PAYMENT_PHASE_STATUSES } from "@/lib/manager/accounting/constants";
import { PERMISSIONS } from "@/lib/constants/permissions";
import type { AdjustmentWithSourceSppRecord, FinancialAdjustmentRecord } from "@/repositories/student-financial-adjustment.repository";
import * as adjustmentRepository from "@/repositories/student-financial-adjustment.repository";
import type { FinancialFormInviteRecord } from "@/repositories/student-financial-form-invite.repository";
import * as inviteRepository from "@/repositories/student-financial-form-invite.repository";
import type { FinancialFormRecord } from "@/repositories/student-financial-form.repository";
import * as formRepository from "@/repositories/student-financial-form.repository";
import type { StudentPaymentPhaseRecord } from "@/repositories/student-payment-phase.repository";
import * as studentPaymentPhaseRepository from "@/repositories/student-payment-phase.repository";
import {
  assertPermission,
  assertStudentSelfAccess,
} from "@/services/auth/authorization.service";
import type {
  ManagerFinancialAdjustmentRow,
  ManagerFinancialFormInviteRow,
  ManagerFinancialFormRow,
  ManagerImportableAdjustmentRow,
  ManagerMissingPriorAdjustmentRow,
} from "@/types/manager-financial-adjustment";
import type { ManagerPaymentPhaseRow } from "@/types/manager-payment-phase";
import type { Supabase } from "@/services/shared/mutation";
import {
  mapAdjustmentRecord,
  mapFormRecord,
  mapImportableAdjustmentRecord,
  mapInviteRecord,
} from "./student-financial-adjustment-shared";

export type GetAdjustmentResult = ManagerFinancialAdjustmentRow | null;

export type GetImportableAdjustmentsResult = ManagerImportableAdjustmentRow[];

export type GetMissingPriorAdjustmentResult = ManagerMissingPriorAdjustmentRow[];

export type GetFormsResult = ManagerFinancialFormRow[];

export type GetInvitesResult = ManagerFinancialFormInviteRow[];

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

export async function getAdjustmentForSppForSelf(
  adminClient: Supabase,
  actorUserId: string | null,
  sppId: string
): Promise<GetAdjustmentResult> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.ACCOUNTING_VIEW
  );
  const userId = await assertStudentSelfAccess(adminClient, actorUserId);

  const { data: spp, error: sppError } =
    await studentPaymentPhaseRepository.findSppById(adminClient, sppId);

  if (sppError) {
    throw new Error(sppError.message);
  }

  if (!spp || (spp as StudentPaymentPhaseRecord).student_id !== userId) {
    return null;
  }

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

/**
 * Opened-phase SPPs with no adjustment where the student has at least one
 * adjustment on another SPP (import follow-up queue).
 */
export async function listOpenSppsMissingPriorAdjustmentForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  phases: Pick<
    ManagerPaymentPhaseRow,
    "id" | "name" | "semester_id" | "semester_name" | "status"
  >[]
): Promise<GetMissingPriorAdjustmentResult> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.ACCOUNTING_VIEW
  );

  const openedPhases = phases.filter(
    (phase) => phase.status === PAYMENT_PHASE_STATUSES.OPENED
  );
  if (openedPhases.length === 0) {
    return [];
  }

  const phaseById = new Map(openedPhases.map((phase) => [phase.id, phase]));

  const { data: qualifying, error } =
    await adjustmentRepository.listOpenSppsMissingPriorAdjustment(
      adminClient,
      openedPhases.map((phase) => phase.id)
    );
  if (error) {
    throw new Error(error.message);
  }

  const rows: ManagerMissingPriorAdjustmentRow[] = [];
  for (const spp of qualifying ?? []) {
    const phase = phaseById.get(spp.payment_phase_id);
    if (!phase) {
      continue;
    }
    const fullName = spp.full_name?.trim();
    const username = spp.username?.trim();
    rows.push({
      spp_id: spp.spp_id,
      student_id: spp.student_id,
      student_profile_id: spp.student_profile_id,
      student_label: fullName || username || spp.student_id,
      payment_phase_id: phase.id,
      payment_phase_name: phase.name,
      semester_id: phase.semester_id,
      semester_name: phase.semester_name,
      spp_status: spp.spp_status,
    });
  }

  return rows.sort(
    (a, b) =>
      a.student_label.localeCompare(b.student_label) ||
      a.payment_phase_name.localeCompare(b.payment_phase_name)
  );
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
