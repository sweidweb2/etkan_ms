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
import { isPhaseUpfrontWindowActive } from "@/lib/manager/accounting/upfront-window";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { createNavStepTimer } from "@/lib/debug/nav-timing";
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
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import {
  assertPermission,
  getUnauthorizedError,
} from "@/services/auth/authorization.service";
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

const PAYMENT_AMOUNT_MESSAGE =
  "Amount must be greater than 0 and at most the payment phase price.";

function mapPaymentWriteError(
  message: string,
  fallback: string
): { success: false; error: string; fieldErrors?: FieldErrors } {
  if (message.includes(PAYMENT_AMOUNT_MESSAGE)) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: { amount: [PAYMENT_AMOUNT_MESSAGE] },
    };
  }

  const known = [
    "Student payment phase not found.",
    "Cannot record payments on a cancelled payment phase.",
    "Cannot record payments on a cancelled student assignment.",
    "Payment not found.",
    "Payment does not belong to this student.",
    "This student payment phase has payments. Delete all payments first.",
  ];

  for (const item of known) {
    if (message.includes(item)) {
      return { success: false, error: item };
    }
  }

  return { success: false, error: fallback };
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
  const [studentMeta, billingClass] = await Promise.all([
    resolveStudentMeta(adminClient, sppRecord.student_id),
    resolveInProgressClassForSemester(adminClient, phaseRecord.semester_id),
  ]);
  const phaseStatus = isPaymentPhaseStatus(phaseRecord.status)
    ? phaseRecord.status
    : PAYMENT_PHASE_STATUSES.OPENED;
  const sppStatus = isStudentPaymentPhaseStatus(sppRecord.status)
    ? sppRecord.status
    : STUDENT_PAYMENT_PHASE_STATUSES.PENDING;
  const remaining = Number(sppRecord.remaining_amount);

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
    phase_upfront_amount: Number(phaseRecord.upfront_amount),
    upfront_window_active: isPhaseUpfrontWindowActive({
      status: phaseStatus,
      start_date: phaseRecord.start_date,
      upfront_amount: Number(phaseRecord.upfront_amount),
    }),
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
  const timer = createNavStepTimer("createStudentPayment");
  try {
    const unauthorized = await timer.step("auth", () =>
      getUnauthorizedError(
        adminClient,
        actorUserId,
        PERMISSIONS.ACCOUNTING_PAYMENTS_CREATE
      )
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

    const { data, error } = await timer.step("rpc", () =>
      studentPaymentRepository.createStudentPaymentWithRecalc(adminClient, {
        student_payment_phase_id: parsed.data.student_payment_phase_id,
        payment_date: parsed.data.payment_date,
        amount: parsed.data.amount,
        payment_method: parsed.data.payment_method,
        received_by: parsed.data.received_by.trim(),
        received_by_management: parsed.data.received_by_management,
        notes: normalizeOptionalString(parsed.data.notes),
      })
    );

    if (error) {
      return mapPaymentWriteError(
        error.message,
        "Unable to create payment. Please try again."
      );
    }

    if (!data?.payment || !data.paymentPhaseId) {
      return {
        success: false,
        error: "Unable to create payment. Please try again.",
      };
    }

    const created = data.payment;

    await timer.step("audit", () =>
      recordManagerAuditLog(adminClient, actor, {
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
      })
    );

    return {
      success: true,
      payment: mapPaymentRecordToRow(created),
      message: "Payment recorded.",
      payment_phase_id: data.paymentPhaseId,
    };
  } finally {
    timer.end();
  }
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

  const { data, error } =
    await studentPaymentRepository.updateStudentPaymentWithRecalc(adminClient, {
      id: parsed.data.id,
      student_payment_phase_id: parsed.data.student_payment_phase_id,
      payment_date: parsed.data.payment_date,
      amount: parsed.data.amount,
      payment_method: parsed.data.payment_method,
      received_by: parsed.data.received_by.trim(),
      received_by_management: parsed.data.received_by_management,
      notes: normalizeOptionalString(parsed.data.notes),
    });

  if (error) {
    return mapPaymentWriteError(
      error.message,
      "Unable to update payment. Please try again."
    );
  }

  if (!data?.payment || !data.paymentPhaseId) {
    return {
      success: false,
      error: "Unable to update payment. Please try again.",
    };
  }

  const updated = data.payment;
  const previous = data.previous;

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "student_payments",
    record_id: updated.id,
    old_data: previous
      ? {
          payment_date: previous.payment_date,
          amount: previous.amount,
          payment_method: previous.payment_method,
          received_by: previous.received_by,
        }
      : null,
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
    payment: mapPaymentRecordToRow(updated),
    message: "Payment updated.",
    payment_phase_id: data.paymentPhaseId,
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

  const { data, error } =
    await studentPaymentRepository.deleteStudentPaymentWithRecalc(
      adminClient,
      parsed.data.id,
      parsed.data.student_payment_phase_id
    );

  if (error) {
    return mapPaymentWriteError(
      error.message,
      "Unable to delete payment. Please try again."
    );
  }

  if (!data?.deleted || !data.studentPaymentPhaseId || !data.paymentPhaseId) {
    return {
      success: false,
      error: "Unable to delete payment. Please try again.",
    };
  }

  const existing = data.deleted;

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
    student_payment_phase_id: data.studentPaymentPhaseId,
    payment_phase_id: data.paymentPhaseId,
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

  const { data, error } =
    await studentPaymentPhaseRepository.deleteStudentPaymentPhaseWithRecalc(
      adminClient,
      parsed.data.id
    );

  if (error) {
    return mapPaymentWriteError(
      error.message,
      "Unable to delete student payment phase. Please try again."
    );
  }

  if (!data?.deleted || !data.paymentPhaseId) {
    return {
      success: false,
      error: "Unable to delete student payment phase. Please try again.",
    };
  }

  const deleted = data.deleted;
  const paymentPhaseId = data.paymentPhaseId;

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
