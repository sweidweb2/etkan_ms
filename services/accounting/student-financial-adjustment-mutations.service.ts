import "server-only";

import { PERMISSIONS } from "@/lib/constants/permissions";
import { getLocalIsoDate } from "@/lib/utils/local-iso-date";
import {
  createFinancialAdjustmentSchema,
  updateFinancialAdjustmentSchema,
} from "@/lib/validators/manager/create-financial-adjustment";
import { importFinancialAdjustmentSchema } from "@/lib/validators/manager/import-financial-adjustment";
import { deleteFinancialAdjustmentSchema } from "@/lib/validators/manager/delete-financial-adjustment";
import * as adjustmentRepository from "@/repositories/student-financial-adjustment.repository";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import { getUnauthorizedError } from "@/services/auth/authorization.service";
import type { ManagerFinancialAdjustmentRow } from "@/types/manager-financial-adjustment";
import type { MutationFailure, Supabase } from "@/services/shared/mutation";
import {
  assertMutationsAllowed,
  loadSppAndPhase,
  loadSppFinancialSnapshot,
  mapAdjustmentRecord,
  mapAdjustmentWriteError,
  normalizeOptionalString,
  type AdjustmentMutationSuccess,
} from "./student-financial-adjustment-shared";

export type CreateAdjustmentResult =
  | (AdjustmentMutationSuccess & {
      adjustment: ManagerFinancialAdjustmentRow;
    })
  | MutationFailure;

export type ImportAdjustmentResult = CreateAdjustmentResult;

export type UpdateAdjustmentResult =
  | (AdjustmentMutationSuccess & {
      adjustment: ManagerFinancialAdjustmentRow;
    })
  | MutationFailure;

export type DeleteAdjustmentResult = AdjustmentMutationSuccess | MutationFailure;

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

  const snapshot = await loadSppFinancialSnapshot(
    adminClient,
    data.studentPaymentPhaseId,
    data.spp
  );
  if ("error" in snapshot) {
    return { success: false, error: snapshot.error };
  }

  return {
    success: true,
    message: "Financial adjustment created.",
    adjustment: mapAdjustmentRecord(created),
    student_payment_phase_id: data.studentPaymentPhaseId,
    payment_phase_id: data.paymentPhaseId,
    spp: snapshot.spp,
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
    targetLoaded.spp.status,
    targetLoaded.dropCompleted
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

  const snapshot = await loadSppFinancialSnapshot(
    adminClient,
    data.studentPaymentPhaseId,
    data.spp
  );
  if ("error" in snapshot) {
    return { success: false, error: snapshot.error };
  }

  return {
    success: true,
    message: "Financial adjustment imported.",
    adjustment: mapAdjustmentRecord(created),
    student_payment_phase_id: data.studentPaymentPhaseId,
    payment_phase_id: data.paymentPhaseId,
    spp: snapshot.spp,
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

  const snapshot = await loadSppFinancialSnapshot(
    adminClient,
    data.studentPaymentPhaseId,
    data.spp
  );
  if ("error" in snapshot) {
    return { success: false, error: snapshot.error };
  }

  return {
    success: true,
    message: "Financial adjustment updated.",
    adjustment: mapAdjustmentRecord(updated),
    student_payment_phase_id: data.studentPaymentPhaseId,
    payment_phase_id: data.paymentPhaseId,
    spp: snapshot.spp,
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

  const snapshot = await loadSppFinancialSnapshot(
    adminClient,
    data.studentPaymentPhaseId,
    data.spp
  );
  if ("error" in snapshot) {
    return { success: false, error: snapshot.error };
  }

  return {
    success: true,
    message: "Financial adjustment deleted.",
    student_payment_phase_id: data.studentPaymentPhaseId,
    payment_phase_id: data.paymentPhaseId,
    spp: snapshot.spp,
  };
}
