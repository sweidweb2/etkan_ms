import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_VALUES,
  PAYMENT_PHASE_STATUSES,
  STUDENT_PAYMENT_PHASE_STATUSES,
  type PaymentMethod,
  type PaymentPhaseStatus,
  type StudentPaymentPhaseStatus,
} from "@/lib/manager/accounting/constants";
import { resolveInProgressClassForSemester } from "@/lib/manager/accounting/resolve-in-progress-class";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { dateRangeForYearMonth } from "@/lib/utils/iso-date-range";
import { createStudentPaymentSchema } from "@/lib/validators/manager/create-student-payment";
import { deleteStudentPaymentSchema } from "@/lib/validators/manager/delete-student-payment";
import { deleteStudentPaymentPhaseSchema } from "@/lib/validators/manager/delete-student-payment-phase";
import { updateStudentPaymentSchema } from "@/lib/validators/manager/update-student-payment";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { PaymentPhaseListRecord } from "@/repositories/payment-phase.repository";
import * as paymentPhaseRepository from "@/repositories/payment-phase.repository";
import * as profileRepository from "@/repositories/profile.repository";
import type { StudentPaymentPhaseRecord } from "@/repositories/student-payment-phase.repository";
import * as studentPaymentPhaseRepository from "@/repositories/student-payment-phase.repository";
import type { StudentPaymentRecord } from "@/repositories/student-payment.repository";
import * as studentPaymentRepository from "@/repositories/student-payment.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import {
  recalcPhaseStatusFromSpps,
  recalcSppAndPhaseStatus,
} from "@/services/accounting-recalc.service";
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
  ManagerSppDetail,
  ManagerStudentPaymentRow,
} from "@/types/manager-student-payment";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export type CreateStudentPaymentSuccess = {
  success: true;
  payment: ManagerStudentPaymentRow;
  message: string;
  payment_phase_id: string;
};

export type CreateStudentPaymentFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type CreateStudentPaymentResult =
  | CreateStudentPaymentSuccess
  | CreateStudentPaymentFailure;

export type UpdateStudentPaymentSuccess = {
  success: true;
  payment: ManagerStudentPaymentRow;
  message: string;
  payment_phase_id: string;
};

export type UpdateStudentPaymentFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type UpdateStudentPaymentResult =
  | UpdateStudentPaymentSuccess
  | UpdateStudentPaymentFailure;

export type DeleteStudentPaymentSuccess = {
  success: true;
  message: string;
  student_payment_phase_id: string;
  payment_phase_id: string;
};

export type DeleteStudentPaymentFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type DeleteStudentPaymentResult =
  | DeleteStudentPaymentSuccess
  | DeleteStudentPaymentFailure;

function isPaymentPhaseStatus(value: string): value is PaymentPhaseStatus {
  return (
    value === PAYMENT_PHASE_STATUSES.OPENED ||
    value === PAYMENT_PHASE_STATUSES.CLOSED ||
    value === PAYMENT_PHASE_STATUSES.CANCELLED
  );
}

function isStudentPaymentPhaseStatus(
  value: string
): value is StudentPaymentPhaseStatus {
  return (
    value === STUDENT_PAYMENT_PHASE_STATUSES.PENDING ||
    value === STUDENT_PAYMENT_PHASE_STATUSES.PARTIALLY_PAID ||
    value === STUDENT_PAYMENT_PHASE_STATUSES.PAID ||
    value === STUDENT_PAYMENT_PHASE_STATUSES.CANCELLED
  );
}

function isPaymentMethod(value: string): value is PaymentMethod {
  return (PAYMENT_METHOD_VALUES as readonly string[]).includes(value);
}

function normalizeOptionalString(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function mapPaymentRecordToRow(
  record: StudentPaymentRecord
): ManagerStudentPaymentRow {
  return {
    id: record.id,
    student_payment_phase_id: record.student_payment_phase_id,
    payment_date: record.payment_date,
    amount: Number(record.amount),
    payment_method: isPaymentMethod(record.payment_method)
      ? record.payment_method
      : PAYMENT_METHODS.OTHER,
    received_by: record.received_by,
    received_by_management: Boolean(record.received_by_management),
    receipt_number: record.receipt_number,
    notes: record.notes,
    created_at: record.created_at,
  };
}

async function resolveStudentMeta(
  adminClient: Supabase,
  studentId: string
): Promise<{ label: string; student_profile_id: string | null }> {
  const [{ data: profile }, { data: studentProfiles }] = await Promise.all([
    profileRepository.findProfileById(adminClient, studentId),
    studentProfileRepository.listStudentProfilesByUserIds(adminClient, [
      studentId,
    ]),
  ]);

  const studentProfile = studentProfiles?.[0];
  const fullName = studentProfile?.full_name?.trim();
  const username = profile?.username?.trim();

  return {
    label: fullName || username || studentId,
    student_profile_id: studentProfile?.id ?? null,
  };
}

function assertPaymentsAllowed(
  phaseStatus: string,
  sppStatus: string
): string | null {
  if (phaseStatus === PAYMENT_PHASE_STATUSES.CANCELLED) {
    return "Cannot record payments on a cancelled payment phase.";
  }
  if (sppStatus === STUDENT_PAYMENT_PHASE_STATUSES.CANCELLED) {
    return "Cannot record payments on a cancelled student assignment.";
  }
  return null;
}

export async function getSppDetailForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  phaseId: string,
  sppId: string
): Promise<ManagerSppDetail | null> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.ACCOUNTING_VIEW
  );

  const [{ data: spp, error: sppError }, { data: phase, error: phaseError }] =
    await Promise.all([
      studentPaymentPhaseRepository.findSppById(adminClient, sppId),
      paymentPhaseRepository.findPaymentPhaseById(adminClient, phaseId),
    ]);

  if (sppError) {
    throw new Error(sppError.message);
  }

  if (phaseError) {
    throw new Error(phaseError.message);
  }

  if (!spp || !phase) {
    return null;
  }

  if (spp.payment_phase_id !== phaseId) {
    return null;
  }

  const phaseRecord = phase as PaymentPhaseListRecord;
  const sppRecord = spp as StudentPaymentPhaseRecord;
  const studentMeta = await resolveStudentMeta(
    adminClient,
    sppRecord.student_id
  );
  const phaseStatus = isPaymentPhaseStatus(phaseRecord.status)
    ? phaseRecord.status
    : PAYMENT_PHASE_STATUSES.OPENED;
  const sppStatus = isStudentPaymentPhaseStatus(sppRecord.status)
    ? sppRecord.status
    : STUDENT_PAYMENT_PHASE_STATUSES.PENDING;
  const remaining = Number(sppRecord.remaining_amount);
  const billingClass = await resolveInProgressClassForSemester(
    adminClient,
    phaseRecord.semester_id
  );

  return {
    id: sppRecord.id,
    student_id: sppRecord.student_id,
    student_profile_id: studentMeta.student_profile_id,
    student_label: studentMeta.label,
    payment_phase_id: phaseRecord.id,
    payment_phase_name: phaseRecord.name,
    payment_phase_status: phaseStatus,
    semester_id: phaseRecord.semester_id,
    semester_name: phaseRecord.semesters?.name ?? "Unknown semester",
    semester_code: phaseRecord.semester_code,
    billing_class_id: billingClass?.id ?? null,
    billing_class_name: billingClass?.name ?? null,
    phase_amount: Number(phaseRecord.amount),
    status: sppStatus,
    original_amount: Number(sppRecord.original_amount),
    adjustment_amount: Number(sppRecord.adjustment_amount),
    final_amount_due: Number(sppRecord.final_amount_due),
    total_paid: Number(sppRecord.total_paid),
    remaining_amount: remaining,
    has_credit: remaining < 0,
    payments_blocked:
      phaseStatus === PAYMENT_PHASE_STATUSES.CANCELLED ||
      sppStatus === STUDENT_PAYMENT_PHASE_STATUSES.CANCELLED,
    assigned_at: sppRecord.assigned_at,
    created_at: sppRecord.created_at,
  };
}

export async function listPaymentsForSppForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  sppId: string
): Promise<ManagerStudentPaymentRow[]> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.ACCOUNTING_VIEW
  );

  const { data, error } = await studentPaymentRepository.listPaymentsBySppId(
    adminClient,
    sppId
  );

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as StudentPaymentRecord[]).map(mapPaymentRecordToRow);
}

/** Sum of `student_payments.amount` whose `payment_date` falls in the given month (local calendar). */
export async function sumStudentPaymentsForMonthForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  now: Date = new Date()
): Promise<number> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.ACCOUNTING_VIEW
  );

  const { fromInclusive, toExclusive } = dateRangeForYearMonth(
    now.getFullYear(),
    now.getMonth() + 1
  );

  const { data, error } =
    await studentPaymentRepository.listPaymentAmountsBetween(
      adminClient,
      fromInclusive,
      toExclusive
    );

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).reduce(
    (sum, row) => sum + Math.max(0, Number(row.amount) || 0),
    0
  );
}

export async function createStudentPaymentForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    student_payment_phase_id: string;
    payment_date: string;
    amount: number;
    payment_method: string;
    received_by: string;
    received_by_management: boolean;
    notes?: string | null;
  }
): Promise<CreateStudentPaymentResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.ACCOUNTING_PAYMENTS_CREATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = createStudentPaymentSchema.safeParse(input);

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
    return {
      success: false,
      error: "Unable to create payment. Please try again.",
    };
  }

  if (!spp) {
    return { success: false, error: "Student payment phase not found." };
  }

  const { data: phase, error: phaseError } =
    await paymentPhaseRepository.findPaymentPhaseById(
      adminClient,
      spp.payment_phase_id
    );

  if (phaseError || !phase) {
    return {
      success: false,
      error: "Unable to create payment. Please try again.",
    };
  }

  const blocked = assertPaymentsAllowed(phase.status, spp.status);
  if (blocked) {
    return { success: false, error: blocked };
  }

  if (parsed.data.amount <= 0 || parsed.data.amount > phase.amount) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: {
        amount: [
          "Amount must be greater than 0 and at most the payment phase price.",
        ],
      },
    };
  }

  const { data: created, error: createError } =
    await studentPaymentRepository.createStudentPayment(adminClient, {
      student_payment_phase_id: parsed.data.student_payment_phase_id,
      payment_date: parsed.data.payment_date,
      amount: parsed.data.amount,
      payment_method: parsed.data.payment_method,
      received_by: parsed.data.received_by.trim(),
      received_by_management: parsed.data.received_by_management,
      receipt_number: null,
      notes: normalizeOptionalString(parsed.data.notes),
    });

  if (createError || !created) {
    return {
      success: false,
      error: "Unable to create payment. Please try again.",
    };
  }

  try {
    await recalcSppAndPhaseStatus(adminClient, spp.id);
  } catch {
    return {
      success: false,
      error: "Payment created, but balances could not be recalculated.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "info",
    table_name: "student_payments",
    record_id: created.id,
    new_data: {
      student_payment_phase_id: created.student_payment_phase_id,
      payment_date: created.payment_date,
      amount: created.amount,
      payment_method: created.payment_method,
      received_by: created.received_by,
    },
    metadata: { note: "Student payment created." },
  });

  return {
    success: true,
    payment: mapPaymentRecordToRow(created as StudentPaymentRecord),
    message: "Payment recorded.",
    payment_phase_id: spp.payment_phase_id,
  };
}

export async function updateStudentPaymentForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    id: string;
    student_payment_phase_id: string;
    payment_date: string;
    amount: number;
    payment_method: string;
    received_by: string;
    received_by_management: boolean;
    notes?: string | null;
  }
): Promise<UpdateStudentPaymentResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.ACCOUNTING_PAYMENTS_UPDATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = updateStudentPaymentSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { data: existing, error: existingError } =
    await studentPaymentRepository.findPaymentById(adminClient, parsed.data.id);

  if (existingError) {
    return {
      success: false,
      error: "Unable to update payment. Please try again.",
    };
  }

  if (!existing) {
    return { success: false, error: "Payment not found." };
  }

  if (
    existing.student_payment_phase_id !== parsed.data.student_payment_phase_id
  ) {
    return { success: false, error: "Payment does not belong to this student." };
  }

  const { data: spp, error: sppError } =
    await studentPaymentPhaseRepository.findSppById(
      adminClient,
      existing.student_payment_phase_id
    );

  if (sppError || !spp) {
    return {
      success: false,
      error: "Unable to update payment. Please try again.",
    };
  }

  const { data: phase, error: phaseError } =
    await paymentPhaseRepository.findPaymentPhaseById(
      adminClient,
      spp.payment_phase_id
    );

  if (phaseError || !phase) {
    return {
      success: false,
      error: "Unable to update payment. Please try again.",
    };
  }

  const blocked = assertPaymentsAllowed(phase.status, spp.status);
  if (blocked) {
    return { success: false, error: blocked };
  }

  if (parsed.data.amount <= 0 || parsed.data.amount > phase.amount) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: {
        amount: [
          "Amount must be greater than 0 and at most the payment phase price.",
        ],
      },
    };
  }

  const { data: updated, error: updateError } =
    await studentPaymentRepository.updateStudentPayment(
      adminClient,
      parsed.data.id,
      {
        payment_date: parsed.data.payment_date,
        amount: parsed.data.amount,
        payment_method: parsed.data.payment_method,
        received_by: parsed.data.received_by.trim(),
        received_by_management: parsed.data.received_by_management,
        receipt_number: null,
        notes: normalizeOptionalString(parsed.data.notes),
      }
    );

  if (updateError || !updated) {
    return {
      success: false,
      error: "Unable to update payment. Please try again.",
    };
  }

  try {
    await recalcSppAndPhaseStatus(adminClient, spp.id);
  } catch {
    return {
      success: false,
      error: "Payment updated, but balances could not be recalculated.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "student_payments",
    record_id: updated.id,
    old_data: {
      payment_date: existing.payment_date,
      amount: existing.amount,
      payment_method: existing.payment_method,
      received_by: existing.received_by,
    },
    new_data: {
      payment_date: updated.payment_date,
      amount: updated.amount,
      payment_method: updated.payment_method,
      received_by: updated.received_by,
    },
    metadata: { note: "Student payment updated." },
  });

  return {
    success: true,
    payment: mapPaymentRecordToRow(updated as StudentPaymentRecord),
    message: "Payment updated.",
    payment_phase_id: spp.payment_phase_id,
  };
}

export async function deleteStudentPaymentForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    id: string;
    student_payment_phase_id?: string;
  }
): Promise<DeleteStudentPaymentResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.ACCOUNTING_PAYMENTS_DELETE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = deleteStudentPaymentSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { data: existing, error: existingError } =
    await studentPaymentRepository.findPaymentById(adminClient, parsed.data.id);

  if (existingError) {
    return {
      success: false,
      error: "Unable to delete payment. Please try again.",
    };
  }

  if (!existing) {
    return { success: false, error: "Payment not found." };
  }

  if (
    parsed.data.student_payment_phase_id &&
    parsed.data.student_payment_phase_id !== existing.student_payment_phase_id
  ) {
    return { success: false, error: "Payment does not belong to this student." };
  }

  const { data: spp, error: sppError } =
    await studentPaymentPhaseRepository.findSppById(
      adminClient,
      existing.student_payment_phase_id
    );

  if (sppError || !spp) {
    return {
      success: false,
      error: "Unable to delete payment. Please try again.",
    };
  }

  const { data: phase, error: phaseError } =
    await paymentPhaseRepository.findPaymentPhaseById(
      adminClient,
      spp.payment_phase_id
    );

  if (phaseError || !phase) {
    return {
      success: false,
      error: "Unable to delete payment. Please try again.",
    };
  }

  const blocked = assertPaymentsAllowed(phase.status, spp.status);
  if (blocked) {
    return { success: false, error: blocked };
  }

  const { error: deleteError } =
    await studentPaymentRepository.deleteStudentPayment(
      adminClient,
      existing.id
    );

  if (deleteError) {
    return {
      success: false,
      error: "Unable to delete payment. Please try again.",
    };
  }

  try {
    await recalcSppAndPhaseStatus(adminClient, spp.id);
  } catch {
    return {
      success: false,
      error: "Payment deleted, but balances could not be recalculated.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "delete",
    severity: "warning",
    table_name: "student_payments",
    record_id: existing.id,
    old_data: {
      student_payment_phase_id: existing.student_payment_phase_id,
      payment_date: existing.payment_date,
      amount: existing.amount,
      payment_method: existing.payment_method,
    },
    metadata: { note: "Student payment deleted." },
  });

  return {
    success: true,
    message: "Payment deleted.",
    student_payment_phase_id: spp.id,
    payment_phase_id: spp.payment_phase_id,
  };
}

export type DeleteSppResult =
  | {
      success: true;
      payment_phase_id: string;
      message: string;
    }
  | {
      success: false;
      error: string;
      fieldErrors?: FieldErrors;
    };

export async function deleteSppForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: unknown
): Promise<DeleteSppResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.ACCOUNTING_SPP_DELETE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = deleteStudentPaymentPhaseSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const { data: spp, error: sppError } =
    await studentPaymentPhaseRepository.findSppById(
      adminClient,
      parsed.data.id
    );

  if (sppError) {
    return {
      success: false,
      error: "Unable to delete student payment phase. Please try again.",
    };
  }

  if (!spp) {
    return { success: false, error: "Student payment phase not found." };
  }

  const { data: paymentRows, error: paymentCountError } =
    await studentPaymentRepository.listPaymentSppIdsBySppIds(adminClient, [
      spp.id,
    ]);

  if (paymentCountError) {
    return {
      success: false,
      error: "Unable to verify payments for this student payment phase.",
    };
  }

  if ((paymentRows ?? []).length > 0) {
    return {
      success: false,
      error:
        "This student payment phase has payments. Delete all payments first.",
    };
  }

  const paymentPhaseId = spp.payment_phase_id;

  const { data: deleted, error: deleteError } =
    await studentPaymentPhaseRepository.deleteStudentPaymentPhaseById(
      adminClient,
      spp.id
    );

  if (deleteError || !deleted) {
    return {
      success: false,
      error:
        deleteError?.message ??
        "Unable to delete student payment phase. Please try again.",
    };
  }

  try {
    await recalcPhaseStatusFromSpps(adminClient, paymentPhaseId);
  } catch {
    return {
      success: false,
      error:
        "Student payment phase deleted, but the parent phase could not be recalculated.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "delete",
    severity: "warning",
    table_name: "student_payment_phases",
    record_id: deleted.id,
    old_data: {
      student_id: deleted.student_id,
      payment_phase_id: paymentPhaseId,
      status: deleted.status,
      original_amount: deleted.original_amount,
      final_amount_due: deleted.final_amount_due,
      total_paid: deleted.total_paid,
    },
    new_data: null,
    metadata: {
      note: "Student payment phase deleted from accounting detail.",
    },
  });

  return {
    success: true,
    payment_phase_id: paymentPhaseId,
    message: "Student payment phase deleted.",
  };
}
