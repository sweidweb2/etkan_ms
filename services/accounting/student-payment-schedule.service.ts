import {
  PAYMENT_SCHEDULE_STATUSES,
  PAYMENT_SCHEDULE_STATUS_VALUES,
  type PaymentScheduleStatus,
} from "@/lib/manager/accounting/constants";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { createStudentPaymentScheduleSchema } from "@/lib/validators/manager/create-student-payment-schedule";
import { deleteStudentPaymentScheduleSchema } from "@/lib/validators/manager/delete-student-payment-schedule";
import { updateStudentPaymentScheduleSchema } from "@/lib/validators/manager/update-student-payment-schedule";
import type { StudentPaymentScheduleRecord } from "@/repositories/student-payment-schedule.repository";
import * as studentPaymentScheduleRepository from "@/repositories/student-payment-schedule.repository";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import {
  assertPermission,
  assertStudentSelfAccess,
  getUnauthorizedError,
} from "@/services/auth/authorization.service";
import type { FieldErrors } from "@/types/auth";
import type { ManagerStudentPaymentScheduleRow } from "@/types/manager-student-payment-schedule";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import type { StudentPaymentPhaseRecord } from "@/repositories/student-payment-phase.repository";
import * as studentPaymentPhaseRepository from "@/repositories/student-payment-phase.repository";

type Supabase = SupabaseClient<Database>;

export type CreateStudentPaymentScheduleSuccess = {
  success: true;
  schedule: ManagerStudentPaymentScheduleRow;
  message: string;
  student_payment_phase_id: string;
};

export type CreateStudentPaymentScheduleFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type CreateStudentPaymentScheduleResult =
  | CreateStudentPaymentScheduleSuccess
  | CreateStudentPaymentScheduleFailure;

export type UpdateStudentPaymentScheduleSuccess = {
  success: true;
  schedule: ManagerStudentPaymentScheduleRow;
  message: string;
  student_payment_phase_id: string;
};

export type UpdateStudentPaymentScheduleFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type UpdateStudentPaymentScheduleResult =
  | UpdateStudentPaymentScheduleSuccess
  | UpdateStudentPaymentScheduleFailure;

export type DeleteStudentPaymentScheduleSuccess = {
  success: true;
  message: string;
  student_payment_phase_id: string;
};

export type DeleteStudentPaymentScheduleFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type DeleteStudentPaymentScheduleResult =
  | DeleteStudentPaymentScheduleSuccess
  | DeleteStudentPaymentScheduleFailure;

function isPaymentScheduleStatus(value: string): value is PaymentScheduleStatus {
  return (PAYMENT_SCHEDULE_STATUS_VALUES as readonly string[]).includes(value);
}

function normalizeOptionalString(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function mapScheduleRecordToRow(
  record: StudentPaymentScheduleRecord
): ManagerStudentPaymentScheduleRow {
  const status = isPaymentScheduleStatus(record.status)
    ? record.status
    : PAYMENT_SCHEDULE_STATUSES.PLANNED;

  return {
    id: record.id,
    student_payment_phase_id: record.student_payment_phase_id,
    due_date: record.due_date,
    amount: Number(record.amount),
    label: record.label,
    status,
    notes: record.notes,
    created_at: record.created_at,
    updated_at: record.updated_at,
    is_overdue:
      status === PAYMENT_SCHEDULE_STATUSES.PLANNED &&
      record.due_date < todayIsoDate(),
  };
}

function mapScheduleWriteError(
  message: string,
  fallback: string
): { success: false; error: string; fieldErrors?: FieldErrors } {
  const known = [
    "Student payment phase not found.",
    "Cannot edit payment schedules on a cancelled student assignment.",
    "Cannot edit payment schedules on a closed or cancelled payment phase.",
    "Payment schedule not found.",
    "Payment schedule does not belong to this student.",
    "Due date is required.",
    "Amount must be greater than 0.",
    "Label is required.",
    "Label must be at most 80 characters.",
    "Invalid schedule status.",
  ];

  if (known.some((entry) => message.includes(entry))) {
    return { success: false, error: message };
  }

  return { success: false, error: fallback };
}

export async function listStudentPaymentSchedulesForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  sppId: string
): Promise<ManagerStudentPaymentScheduleRow[]> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.PAYMENT_SCHEDULES_VIEW
  );

  const { data, error } =
    await studentPaymentScheduleRepository.listSchedulesBySppId(
      adminClient,
      sppId
    );

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as StudentPaymentScheduleRecord[]).map(
    mapScheduleRecordToRow
  );
}

export async function listStudentPaymentSchedulesForSelf(
  adminClient: Supabase,
  actorUserId: string | null,
  sppId: string
): Promise<ManagerStudentPaymentScheduleRow[]> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.PAYMENT_SCHEDULES_VIEW
  );
  const userId = await assertStudentSelfAccess(adminClient, actorUserId);

  const { data: spp, error: sppError } =
    await studentPaymentPhaseRepository.findSppById(adminClient, sppId);

  if (sppError) {
    throw new Error(sppError.message);
  }

  if (!spp || (spp as StudentPaymentPhaseRecord).student_id !== userId) {
    return [];
  }

  const { data, error } =
    await studentPaymentScheduleRepository.listSchedulesBySppId(
      adminClient,
      sppId
    );

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as StudentPaymentScheduleRecord[]).map(
    mapScheduleRecordToRow
  );
}

export async function createStudentPaymentScheduleForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    student_payment_phase_id: string;
    due_date: string;
    amount: number;
    label: string;
    status: string;
    notes?: string | null;
  }
): Promise<CreateStudentPaymentScheduleResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.PAYMENT_SCHEDULES_CREATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = createStudentPaymentScheduleSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { data, error } =
    await studentPaymentScheduleRepository.createStudentPaymentScheduleWithRpc(
      adminClient,
      {
        student_payment_phase_id: parsed.data.student_payment_phase_id,
        due_date: parsed.data.due_date,
        amount: parsed.data.amount,
        label: parsed.data.label.trim(),
        status: parsed.data.status,
        notes: normalizeOptionalString(parsed.data.notes),
        created_by: actorUserId,
      }
    );

  if (error) {
    return mapScheduleWriteError(
      error.message,
      "Unable to create payment schedule. Please try again."
    );
  }

  if (!data?.schedule || !data.studentPaymentPhaseId) {
    return {
      success: false,
      error: "Unable to create payment schedule. Please try again.",
    };
  }

  const created = data.schedule;

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "info",
    table_name: "student_payment_schedules",
    record_id: created.id,
    new_data: {
      student_payment_phase_id: created.student_payment_phase_id,
      due_date: created.due_date,
      amount: created.amount,
      label: created.label,
      status: created.status,
    },
    metadata: { note: "Payment schedule row created." },
  });

  return {
    success: true,
    schedule: mapScheduleRecordToRow(created),
    message: "Payment schedule added.",
    student_payment_phase_id: data.studentPaymentPhaseId,
  };
}

export async function updateStudentPaymentScheduleForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    id: string;
    student_payment_phase_id: string;
    due_date: string;
    amount: number;
    label: string;
    status: string;
    notes?: string | null;
  }
): Promise<UpdateStudentPaymentScheduleResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.PAYMENT_SCHEDULES_UPDATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = updateStudentPaymentScheduleSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { data, error } =
    await studentPaymentScheduleRepository.updateStudentPaymentScheduleWithRpc(
      adminClient,
      {
        id: parsed.data.id,
        student_payment_phase_id: parsed.data.student_payment_phase_id,
        due_date: parsed.data.due_date,
        amount: parsed.data.amount,
        label: parsed.data.label.trim(),
        status: parsed.data.status,
        notes: normalizeOptionalString(parsed.data.notes),
      }
    );

  if (error) {
    return mapScheduleWriteError(
      error.message,
      "Unable to update payment schedule. Please try again."
    );
  }

  if (!data?.schedule || !data.studentPaymentPhaseId) {
    return {
      success: false,
      error: "Unable to update payment schedule. Please try again.",
    };
  }

  const updated = data.schedule;
  const previous = data.previous;

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "student_payment_schedules",
    record_id: updated.id,
    old_data: previous
      ? {
          due_date: previous.due_date,
          amount: previous.amount,
          label: previous.label,
          status: previous.status,
        }
      : null,
    new_data: {
      due_date: updated.due_date,
      amount: updated.amount,
      label: updated.label,
      status: updated.status,
    },
    metadata: { note: "Payment schedule row updated." },
  });

  return {
    success: true,
    schedule: mapScheduleRecordToRow(updated),
    message: "Payment schedule updated.",
    student_payment_phase_id: data.studentPaymentPhaseId,
  };
}

export async function deleteStudentPaymentScheduleForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    id: string;
    student_payment_phase_id?: string;
  }
): Promise<DeleteStudentPaymentScheduleResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.PAYMENT_SCHEDULES_DELETE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = deleteStudentPaymentScheduleSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { data, error } =
    await studentPaymentScheduleRepository.deleteStudentPaymentScheduleWithRpc(
      adminClient,
      parsed.data.id,
      parsed.data.student_payment_phase_id || undefined
    );

  if (error) {
    return mapScheduleWriteError(
      error.message,
      "Unable to delete payment schedule. Please try again."
    );
  }

  if (!data?.deleted || !data.studentPaymentPhaseId) {
    return {
      success: false,
      error: "Unable to delete payment schedule. Please try again.",
    };
  }

  const existing = data.deleted;

  await recordManagerAuditLog(adminClient, actor, {
    action: "delete",
    severity: "warning",
    table_name: "student_payment_schedules",
    record_id: existing.id,
    old_data: {
      student_payment_phase_id: existing.student_payment_phase_id,
      due_date: existing.due_date,
      amount: existing.amount,
      label: existing.label,
      status: existing.status,
    },
    metadata: { note: "Payment schedule row deleted." },
  });

  return {
    success: true,
    message: "Payment schedule deleted.",
    student_payment_phase_id: data.studentPaymentPhaseId,
  };
}
