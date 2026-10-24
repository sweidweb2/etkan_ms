import "server-only";

import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  getSppClearanceExpiresAtIso,
  isSppClearanceActive,
} from "@/lib/manager/accounting/spp-clearance";
import { STUDENT_PAYMENT_PHASE_STATUSES } from "@/lib/manager/accounting/constants";
import { createSppClearanceSchema } from "@/lib/validators/manager/upsert-spp-clearance";
import { updateSppClearanceSchema } from "@/lib/validators/manager/upsert-spp-clearance";
import { deleteSppClearanceSchema } from "@/lib/validators/manager/delete-spp-clearance";
import { bulkCreateSppClearancesSchema } from "@/lib/validators/manager/bulk-create-spp-clearances";
import { bulkDeleteSppClearancesSchema } from "@/lib/validators/manager/bulk-delete-spp-clearances";
import * as studentPaymentPhaseClearanceRepository from "@/repositories/student-payment-phase-clearance.repository";
import type { StudentPaymentPhaseClearanceRecord } from "@/repositories/student-payment-phase-clearance.repository";
import * as studentPaymentPhaseRepository from "@/repositories/student-payment-phase.repository";
import type { StudentPaymentPhaseRecord } from "@/repositories/student-payment-phase.repository";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import {
  assertPermission,
  getUnauthorizedError,
  hasPermission,
} from "@/services/auth/authorization.service";
import type { FieldErrors } from "@/types/auth";
import type { ManagerSppClearanceDto } from "@/types/manager-spp-clearance";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

function normalizeOptionalString(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function mapClearanceRecordToDto(
  record: StudentPaymentPhaseClearanceRecord
): ManagerSppClearanceDto | null {
  if (!isSppClearanceActive(record.created_at, Number(record.duration_days))) {
    return null;
  }

  return {
    id: record.id,
    duration_days: Number(record.duration_days),
    notes: record.notes,
    created_at: record.created_at,
    expires_at: getSppClearanceExpiresAtIso(
      record.created_at,
      Number(record.duration_days)
    ),
    is_active: true,
  };
}

export async function loadActiveClearanceDtoBySppId(
  adminClient: Supabase,
  sppId: string
): Promise<ManagerSppClearanceDto | null> {
  const { data, error } =
    await studentPaymentPhaseClearanceRepository.findClearanceBySppId(
      adminClient,
      sppId
    );

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return mapClearanceRecordToDto(data as StudentPaymentPhaseClearanceRecord);
}

export async function loadActiveClearanceDtosBySppIds(
  adminClient: Supabase,
  sppIds: string[]
): Promise<Map<string, ManagerSppClearanceDto>> {
  const map = new Map<string, ManagerSppClearanceDto>();
  if (sppIds.length === 0) {
    return map;
  }

  const { data, error } =
    await studentPaymentPhaseClearanceRepository.findClearancesBySppIds(
      adminClient,
      sppIds
    );

  if (error) {
    throw new Error(error.message);
  }

  for (const record of (data ?? []) as StudentPaymentPhaseClearanceRecord[]) {
    const dto = mapClearanceRecordToDto(record);
    if (dto) {
      map.set(record.student_payment_phase_id, dto);
    }
  }

  return map;
}

function sppAllowsClearanceMutation(status: string): boolean {
  return (
    status !== STUDENT_PAYMENT_PHASE_STATUSES.PAID &&
    status !== STUDENT_PAYMENT_PHASE_STATUSES.CANCELLED
  );
}

type ClearanceMutationSuccess = {
  success: true;
  clearance: ManagerSppClearanceDto;
  message: string;
  student_payment_phase_id: string;
  payment_phase_id: string;
};

type ClearanceMutationFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type UpsertSppClearanceResult =
  | ClearanceMutationSuccess
  | ClearanceMutationFailure;

export type DeleteSppClearanceResult =
  | {
      success: true;
      message: string;
      student_payment_phase_id: string;
      payment_phase_id: string;
    }
  | ClearanceMutationFailure;

export type BulkCreateSppClearancesResult =
  | {
      success: true;
      message: string;
      created_count: number;
      payment_phase_id: string;
    }
  | ClearanceMutationFailure;

export type BulkDeleteSppClearancesResult =
  | {
      success: true;
      message: string;
      deleted_count: number;
      payment_phase_id: string;
    }
  | ClearanceMutationFailure;

function mapUniqueViolation(message: string): string | null {
  if (
    message.includes("student_payment_phase_clearances_student_payment_phase_id") ||
    message.includes("duplicate key") ||
    message.includes("unique constraint")
  ) {
    return "A Month paid marker already exists for this student.";
  }
  return null;
}

export async function createSppClearanceForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: unknown
): Promise<UpsertSppClearanceResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.ACCOUNTING_CLEARANCES_CREATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = createSppClearanceSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { data: spp, error: sppError } =
    await studentPaymentPhaseRepository.findSppById(
      adminClient,
      parsed.data.student_payment_phase_id
    );

  if (sppError) {
    return { success: false, error: sppError.message };
  }

  if (!spp) {
    return { success: false, error: "Student payment phase not found." };
  }

  const sppRecord = spp as StudentPaymentPhaseRecord;
  if (!sppAllowsClearanceMutation(sppRecord.status)) {
    return {
      success: false,
      error:
        sppRecord.status === STUDENT_PAYMENT_PHASE_STATUSES.PAID
          ? "Cannot set Month paid on a paid assignment."
          : "Cannot set Month paid on a cancelled assignment.",
    };
  }

  const { data: existing } =
    await studentPaymentPhaseClearanceRepository.findClearanceBySppId(
      adminClient,
      sppRecord.id
    );

  if (existing && mapClearanceRecordToDto(existing as StudentPaymentPhaseClearanceRecord)) {
    return {
      success: false,
      error: "A Month paid marker already exists for this student.",
    };
  }

  if (existing) {
    await studentPaymentPhaseClearanceRepository.deleteClearanceById(
      adminClient,
      (existing as StudentPaymentPhaseClearanceRecord).id
    );
  }

  const { data: created, error } =
    await studentPaymentPhaseClearanceRepository.insertClearance(adminClient, {
      student_payment_phase_id: sppRecord.id,
      duration_days: parsed.data.duration_days,
      notes: normalizeOptionalString(parsed.data.notes),
      created_by: actorUserId,
    });

  if (error) {
    const unique = mapUniqueViolation(error.message);
    return {
      success: false,
      error: unique ?? "Unable to create Month paid marker. Please try again.",
    };
  }

  if (!created) {
    return {
      success: false,
      error: "Unable to create Month paid marker. Please try again.",
    };
  }

  const record = created as StudentPaymentPhaseClearanceRecord;
  const dto = mapClearanceRecordToDto(record);
  if (!dto) {
    return {
      success: false,
      error: "Unable to create Month paid marker. Please try again.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "info",
    table_name: "student_payment_phase_clearances",
    record_id: record.id,
    new_data: {
      student_payment_phase_id: record.student_payment_phase_id,
      duration_days: record.duration_days,
      notes: record.notes,
    },
    metadata: { note: "SPP Month paid clearance created." },
  });

  return {
    success: true,
    clearance: dto,
    message: "Month paid marker set.",
    student_payment_phase_id: sppRecord.id,
    payment_phase_id: sppRecord.payment_phase_id,
  };
}

export async function updateSppClearanceForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: unknown
): Promise<UpsertSppClearanceResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.ACCOUNTING_CLEARANCES_UPDATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = updateSppClearanceSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { data: existing, error: existingError } =
    await studentPaymentPhaseClearanceRepository.findClearanceById(
      adminClient,
      parsed.data.id
    );

  if (existingError) {
    return { success: false, error: existingError.message };
  }

  if (!existing) {
    return { success: false, error: "Month paid marker not found." };
  }

  const previous = existing as StudentPaymentPhaseClearanceRecord;
  if (previous.student_payment_phase_id !== parsed.data.student_payment_phase_id) {
    return {
      success: false,
      error: "Month paid marker does not belong to this student.",
    };
  }

  const { data: spp, error: sppError } =
    await studentPaymentPhaseRepository.findSppById(
      adminClient,
      previous.student_payment_phase_id
    );

  if (sppError) {
    return { success: false, error: sppError.message };
  }

  if (!spp) {
    return { success: false, error: "Student payment phase not found." };
  }

  const sppRecord = spp as StudentPaymentPhaseRecord;
  if (!sppAllowsClearanceMutation(sppRecord.status)) {
    return {
      success: false,
      error: "Cannot edit Month paid on a paid or cancelled assignment.",
    };
  }

  const { data: updated, error } =
    await studentPaymentPhaseClearanceRepository.updateClearance(
      adminClient,
      previous.id,
      {
        duration_days: parsed.data.duration_days,
        notes: normalizeOptionalString(parsed.data.notes),
        updated_by: actorUserId,
      }
    );

  if (error || !updated) {
    return {
      success: false,
      error: "Unable to update Month paid marker. Please try again.",
    };
  }

  const record = updated as StudentPaymentPhaseClearanceRecord;
  const dto = mapClearanceRecordToDto(record);
  if (!dto) {
    return {
      success: false,
      error: "Unable to update Month paid marker. Please try again.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "student_payment_phase_clearances",
    record_id: record.id,
    old_data: {
      duration_days: previous.duration_days,
      notes: previous.notes,
    },
    new_data: {
      duration_days: record.duration_days,
      notes: record.notes,
    },
    metadata: { note: "SPP Month paid clearance updated." },
  });

  return {
    success: true,
    clearance: dto,
    message: "Month paid marker updated.",
    student_payment_phase_id: sppRecord.id,
    payment_phase_id: sppRecord.payment_phase_id,
  };
}

export async function deleteSppClearanceForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: unknown
): Promise<DeleteSppClearanceResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.ACCOUNTING_CLEARANCES_DELETE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = deleteSppClearanceSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { data: existing, error: existingError } =
    await studentPaymentPhaseClearanceRepository.findClearanceById(
      adminClient,
      parsed.data.id
    );

  if (existingError) {
    return { success: false, error: existingError.message };
  }

  if (!existing) {
    return { success: false, error: "Month paid marker not found." };
  }

  const previous = existing as StudentPaymentPhaseClearanceRecord;
  if (previous.student_payment_phase_id !== parsed.data.student_payment_phase_id) {
    return {
      success: false,
      error: "Month paid marker does not belong to this student.",
    };
  }

  const { data: spp } = await studentPaymentPhaseRepository.findSppById(
    adminClient,
    previous.student_payment_phase_id
  );
  const paymentPhaseId =
    (spp as StudentPaymentPhaseRecord | null)?.payment_phase_id ?? "";

  const { error } =
    await studentPaymentPhaseClearanceRepository.deleteClearanceById(
      adminClient,
      previous.id
    );

  if (error) {
    return {
      success: false,
      error: "Unable to remove Month paid marker. Please try again.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "delete",
    severity: "warning",
    table_name: "student_payment_phase_clearances",
    record_id: previous.id,
    old_data: {
      student_payment_phase_id: previous.student_payment_phase_id,
      duration_days: previous.duration_days,
      notes: previous.notes,
    },
    metadata: { note: "SPP Month paid clearance deleted." },
  });

  return {
    success: true,
    message: "Month paid marker removed.",
    student_payment_phase_id: previous.student_payment_phase_id,
    payment_phase_id: paymentPhaseId,
  };
}

export async function bulkCreateSppClearancesForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: unknown
): Promise<BulkCreateSppClearancesResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.ACCOUNTING_CLEARANCES_CREATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = bulkCreateSppClearancesSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { data: sppRows, error: sppError } =
    await studentPaymentPhaseRepository.listSppsByPaymentPhaseId(
      adminClient,
      parsed.data.payment_phase_id
    );

  if (sppError) {
    return { success: false, error: sppError.message };
  }

  const records = (sppRows ?? []) as StudentPaymentPhaseRecord[];
  const eligible = records.filter((row) => sppAllowsClearanceMutation(row.status));

  if (eligible.length === 0) {
    return {
      success: true,
      message: "No eligible students to mark Month paid.",
      created_count: 0,
      payment_phase_id: parsed.data.payment_phase_id,
    };
  }

  const existingMap = await loadActiveClearanceDtosBySppIds(
    adminClient,
    eligible.map((row) => row.id)
  );

  const toCreate = eligible.filter((row) => !existingMap.has(row.id));
  if (toCreate.length === 0) {
    return {
      success: true,
      message: "All eligible students already have a Month paid marker.",
      created_count: 0,
      payment_phase_id: parsed.data.payment_phase_id,
    };
  }

  const notes = normalizeOptionalString(parsed.data.notes);
  const { data: created, error } =
    await studentPaymentPhaseClearanceRepository.insertClearancesBulk(
      adminClient,
      toCreate.map((row) => ({
        student_payment_phase_id: row.id,
        duration_days: parsed.data.duration_days,
        notes,
        created_by: actorUserId,
      }))
    );

  if (error) {
    const unique = mapUniqueViolation(error.message);
    return {
      success: false,
      error: unique ?? "Unable to set Month paid markers. Please try again.",
    };
  }

  const createdCount = (created ?? []).length;

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "info",
    table_name: "student_payment_phase_clearances",
    record_id: parsed.data.payment_phase_id,
    new_data: {
      payment_phase_id: parsed.data.payment_phase_id,
      duration_days: parsed.data.duration_days,
      created_count: createdCount,
    },
    metadata: { note: "Bulk SPP Month paid clearances created." },
  });

  return {
    success: true,
    message:
      createdCount === 1
        ? "Month paid marker set for 1 student."
        : `Month paid marker set for ${createdCount} students.`,
    created_count: createdCount,
    payment_phase_id: parsed.data.payment_phase_id,
  };
}

export async function bulkDeleteSppClearancesForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: unknown
): Promise<BulkDeleteSppClearancesResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.ACCOUNTING_CLEARANCES_DELETE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = bulkDeleteSppClearancesSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { data: sppRows, error: sppError } =
    await studentPaymentPhaseRepository.listSppsByPaymentPhaseId(
      adminClient,
      parsed.data.payment_phase_id
    );

  if (sppError) {
    return { success: false, error: sppError.message };
  }

  const records = (sppRows ?? []) as StudentPaymentPhaseRecord[];
  if (records.length === 0) {
    return {
      success: true,
      message: "No Month paid markers to remove.",
      deleted_count: 0,
      payment_phase_id: parsed.data.payment_phase_id,
    };
  }

  const existingMap = await loadActiveClearanceDtosBySppIds(
    adminClient,
    records.map((row) => row.id)
  );
  const sppIdsWithClearance = [...existingMap.keys()];

  if (sppIdsWithClearance.length === 0) {
    return {
      success: true,
      message: "No Month paid markers to remove.",
      deleted_count: 0,
      payment_phase_id: parsed.data.payment_phase_id,
    };
  }

  const { data: deleted, error } =
    await studentPaymentPhaseClearanceRepository.deleteClearancesBySppIds(
      adminClient,
      sppIdsWithClearance
    );

  if (error) {
    return {
      success: false,
      error: "Unable to remove Month paid markers. Please try again.",
    };
  }

  const deletedCount = (deleted ?? []).length;

  await recordManagerAuditLog(adminClient, actor, {
    action: "delete",
    severity: "warning",
    table_name: "student_payment_phase_clearances",
    record_id: parsed.data.payment_phase_id,
    old_data: {
      payment_phase_id: parsed.data.payment_phase_id,
      deleted_count: deletedCount,
    },
    metadata: { note: "Bulk SPP Month paid clearances deleted." },
  });

  return {
    success: true,
    message:
      deletedCount === 1
        ? "Month paid marker removed for 1 student."
        : `Month paid marker removed for ${deletedCount} students.`,
    deleted_count: deletedCount,
    payment_phase_id: parsed.data.payment_phase_id,
  };
}

/** Best-effort delete after payment delete when the manager opts in. */
export async function maybeDeleteClearanceAfterPaymentDelete(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  sppId: string,
  alsoDeleteClearance: boolean
): Promise<void> {
  if (!alsoDeleteClearance || !actorUserId) {
    return;
  }

  const allowed = await hasPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.ACCOUNTING_CLEARANCES_DELETE
  );
  if (!allowed) {
    return;
  }

  const { data: existing } =
    await studentPaymentPhaseClearanceRepository.findClearanceBySppId(
      adminClient,
      sppId
    );

  if (!existing) {
    return;
  }

  const previous = existing as StudentPaymentPhaseClearanceRecord;
  await studentPaymentPhaseClearanceRepository.deleteClearanceById(
    adminClient,
    previous.id
  );

  await recordManagerAuditLog(adminClient, actor, {
    action: "delete",
    severity: "warning",
    table_name: "student_payment_phase_clearances",
    record_id: previous.id,
    old_data: {
      student_payment_phase_id: previous.student_payment_phase_id,
      duration_days: previous.duration_days,
    },
    metadata: {
      note: "SPP Month paid clearance removed with payment delete.",
    },
  });
}

export async function assertCanViewClearances(
  adminClient: Supabase,
  actorUserId: string | null
) {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.ACCOUNTING_CLEARANCES_VIEW
  );
}
