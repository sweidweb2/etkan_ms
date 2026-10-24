import "server-only";

import {
  PAYMENT_PHASE_STATUSES,
  STUDENT_PAYMENT_PHASE_STATUSES,
  type PaymentPhaseStatus,
  type StudentPaymentPhaseStatus,
} from "@/lib/manager/accounting/constants";
import { isPhaseUpfrontWindowActive } from "@/lib/manager/accounting/upfront-window";
import {
  STUDENT_STATUSES,
  type StudentStatusValue,
} from "@/lib/constants/manager-student-status";
import type { PaymentPhaseListRecord } from "@/repositories/payment-phase.repository";
import * as classRepository from "@/repositories/class.repository";
import * as profileRepository from "@/repositories/profile.repository";
import * as studentPaymentPhaseRepository from "@/repositories/student-payment-phase.repository";
import type { StudentPaymentPhaseRecord } from "@/repositories/student-payment-phase.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import type { FieldErrors } from "@/types/auth";
import type {
  ManagerBilledWithoutClassRow,
  ManagerMissingSppRow,
  ManagerPaymentPhaseRow,
  ManagerSppRow,
  ManagerSppSemesterMismatchRow,
} from "@/types/manager-payment-phase";
import type { ManagerStudentWithoutActiveClassRow } from "@/types/manager-student";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

export type Supabase = SupabaseClient<Database>;

export type CreatePaymentPhaseSuccess = {
  success: true;
  phase: ManagerPaymentPhaseRow;
  message: string;
};

export type CreatePaymentPhaseFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type CreatePaymentPhaseResult =
  | CreatePaymentPhaseSuccess
  | CreatePaymentPhaseFailure;

export type RepairMissingSppSuccess = {
  success: true;
  message: string;
};

export type RepairMissingSppFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type RepairMissingSppResult =
  | RepairMissingSppSuccess
  | RepairMissingSppFailure;

export type UpdatePaymentPhaseSuccess = {
  success: true;
  phase: ManagerPaymentPhaseRow;
  message: string;
};

export type UpdatePaymentPhaseFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type UpdatePaymentPhaseResult =
  | UpdatePaymentPhaseSuccess
  | UpdatePaymentPhaseFailure;

export type CancelPaymentPhaseSuccess = {
  success: true;
  phase: ManagerPaymentPhaseRow;
  message: string;
};

export type CancelPaymentPhaseFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type CancelPaymentPhaseResult =
  | CancelPaymentPhaseSuccess
  | CancelPaymentPhaseFailure;

export function isPaymentPhaseStatus(value: string): value is PaymentPhaseStatus {
  return (
    value === PAYMENT_PHASE_STATUSES.OPENED ||
    value === PAYMENT_PHASE_STATUSES.CLOSED ||
    value === PAYMENT_PHASE_STATUSES.CANCELLED
  );
}

export function isStudentPaymentPhaseStatus(
  value: string
): value is StudentPaymentPhaseStatus {
  return (
    value === STUDENT_PAYMENT_PHASE_STATUSES.PENDING ||
    value === STUDENT_PAYMENT_PHASE_STATUSES.PARTIALLY_PAID ||
    value === STUDENT_PAYMENT_PHASE_STATUSES.PAID ||
    value === STUDENT_PAYMENT_PHASE_STATUSES.CANCELLED
  );
}

export function toPhaseListRecord(
  phase: {
    id: string;
    name: string;
    semester_id: string;
    semester_code: string;
    amount: number;
    upfront_amount: number;
    duration_months: number;
    start_date: string;
    end_date: string;
    status: string;
    created_at: string;
    updated_at: string;
  },
  semester: { id: string; name: string; semester_code: string } | null
): PaymentPhaseListRecord {
  return {
    ...phase,
    semesters: semester,
  };
}

export function mapPhaseWriteError(
  message: string,
  fallback: string
): { success: false; error: string; fieldErrors?: FieldErrors } {
  if (message.includes("This semester has no semester code.")) {
    return {
      success: false,
      error: "This semester has no semester code.",
      fieldErrors: {
        semester_id: ["Semester must have a semester code."],
      },
    };
  }

  if (message.includes("Destination payment phase not found.")) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: {
        destination_payment_phase_id: ["Destination payment phase not found."],
      },
    };
  }

  if (
    message.includes(
      "Destination must be different from the current payment phase."
    )
  ) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: {
        destination_payment_phase_id: [
          "Destination must be different from the current payment phase.",
        ],
      },
    };
  }

  if (
    message.includes(
      "Cannot transfer to a payment phase in the same semester."
    )
  ) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: {
        destination_payment_phase_id: [
          "Cannot transfer to a payment phase in the same semester.",
        ],
      },
    };
  }

  const known = [
    "Semester not found.",
    "Payment phase not found.",
    "Only opened or closed payment phases can receive assignments.",
    "No in-progress class found for this semester.",
    "Student is not enrolled in this semester's in-progress class.",
    "Student payment phase not found.",
    "Cancelled student payment phases cannot be transferred.",
    "Destination must be an opened or closed payment phase.",
    "Student already has a payment record on that phase.",
    "This payment phase is already cancelled.",
    "Unable to assign student payment phase. Please try again.",
    "Cannot transfer to a payment phase in the same semester.",
  ];

  for (const item of known) {
    if (message.includes(item)) {
      return { success: false, error: item };
    }
  }

  return { success: false, error: fallback };
}

export function mapPhaseRecordToRow(
  record: PaymentPhaseListRecord,
  sppActiveCount: number,
  sppPaidCount: number,
  billingClass?: { id: string; name: string } | null
): ManagerPaymentPhaseRow {
  return {
    id: record.id,
    name: record.name,
    semester_id: record.semester_id,
    semester_name: record.semesters?.name ?? "Unknown semester",
    semester_code: record.semester_code,
    billing_class_id: billingClass?.id ?? null,
    billing_class_name: billingClass?.name ?? null,
    status: isPaymentPhaseStatus(record.status)
      ? record.status
      : PAYMENT_PHASE_STATUSES.OPENED,
    amount: Number(record.amount),
    upfront_amount: Number(record.upfront_amount),
    duration_months: record.duration_months,
    start_date: record.start_date,
    end_date: record.end_date,
    created_at: record.created_at,
    spp_active_count: sppActiveCount,
    spp_paid_count: sppPaidCount,
    upfront_window_active: isPhaseUpfrontWindowActive(record),
  };
}

export async function buildBillingClassBySemesterId(
  adminClient: Supabase,
  semesterIds: string[]
): Promise<Map<string, { id: string; name: string }>> {
  const map = new Map<string, { id: string; name: string }>();
  const unique = [...new Set(semesterIds.filter(Boolean))];

  if (unique.length === 0) {
    return map;
  }

  const wanted = new Set(unique);
  const { data, error } =
    await classRepository.listInProgressClassesForBilling(adminClient);

  if (error) {
    throw new Error(error.message);
  }

  // Rows are ordered by created_at ascending — first per semester wins.
  for (const row of data ?? []) {
    if (!row.semester_id || !wanted.has(row.semester_id)) {
      continue;
    }
    if (map.has(row.semester_id)) {
      continue;
    }
    map.set(row.semester_id, { id: row.id, name: row.name });
  }

  return map;
}

export async function buildStudentMetaByUserId(
  adminClient: Supabase,
  studentIds: string[]
): Promise<Map<string, { label: string; student_profile_id: string | null }>> {
  const meta = new Map<
    string,
    { label: string; student_profile_id: string | null }
  >();

  if (studentIds.length === 0) {
    return meta;
  }

  const [{ data: profiles }, { data: studentProfiles }] = await Promise.all([
    profileRepository.listProfilesByIds(adminClient, studentIds),
    studentProfileRepository.listStudentProfilesByUserIds(
      adminClient,
      studentIds
    ),
  ]);

  const usernameById = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile.username])
  );
  const studentProfileByUserId = new Map(
    (studentProfiles ?? []).map((profile) => [profile.user_id, profile])
  );

  for (const studentId of studentIds) {
    const studentProfile = studentProfileByUserId.get(studentId);
    const fullName = studentProfile?.full_name?.trim();
    const username = usernameById.get(studentId)?.trim();
    meta.set(studentId, {
      label: fullName || username || studentId,
      student_profile_id: studentProfile?.id ?? null,
    });
  }

  return meta;
}

export function mapSppRecordToRow(
  record: StudentPaymentPhaseRecord,
  studentLabel: string,
  studentProfileId: string | null,
  currentClearance: ManagerSppRow["current_clearance"] = null
): ManagerSppRow {
  return {
    id: record.id,
    student_id: record.student_id,
    student_profile_id: studentProfileId,
    student_label: studentLabel,
    payment_phase_id: record.payment_phase_id,
    status: isStudentPaymentPhaseStatus(record.status)
      ? record.status
      : STUDENT_PAYMENT_PHASE_STATUSES.PENDING,
    original_amount: Number(record.original_amount),
    adjustment_amount: Number(record.adjustment_amount),
    final_amount_due: Number(record.final_amount_due),
    total_paid: Number(record.total_paid),
    remaining_amount: Number(record.remaining_amount),
    assigned_at: record.assigned_at,
    created_at: record.created_at,
    current_clearance: currentClearance,
  };
}

export type SppCountPhase = Pick<
  PaymentPhaseListRecord,
  "id" | "status" | "start_date" | "upfront_amount"
>;

export async function buildSppCountsByPhaseId(
  adminClient: Supabase,
  phases: SppCountPhase[]
): Promise<Map<string, { active: number; paid: number }>> {
  const counts = new Map<string, { active: number; paid: number }>();
  const upfrontPhases = new Map<string, number>();

  for (const phase of phases) {
    counts.set(phase.id, { active: 0, paid: 0 });

    if (isPhaseUpfrontWindowActive(phase)) {
      upfrontPhases.set(phase.id, Number(phase.upfront_amount));
    }
  }

  if (phases.length === 0) {
    return counts;
  }

  const { data, error } =
    await studentPaymentPhaseRepository.countSppsByPaymentPhaseIds(
      adminClient,
      phases.map((phase) => phase.id)
    );

  if (error) {
    throw new Error(error.message);
  }

  for (const row of data ?? []) {
    const upfrontAmount = upfrontPhases.get(row.payment_phase_id);
    counts.set(row.payment_phase_id, {
      active: row.active_count,
      paid:
        upfrontAmount === undefined ? row.paid_count : row.upfront_paid_count,
    });
  }

  return counts;
}

export type AccountingExceptionsSnapshot = {
  missing: ManagerMissingSppRow[];
  withoutClassOrPhase: ManagerStudentWithoutActiveClassRow[];
  billedWithoutClass: ManagerBilledWithoutClassRow[];
  sppSemesterMismatches: ManagerSppSemesterMismatchRow[];
};

export function mapStudentStatusValue(status: string | null): StudentStatusValue {
  if (
    status === STUDENT_STATUSES.ACTIVE ||
    status === STUDENT_STATUSES.INACTIVE ||
    status === STUDENT_STATUSES.GRADUATED ||
    status === STUDENT_STATUSES.SUSPENDED
  ) {
    return status;
  }
  return STUDENT_STATUSES.ACTIVE;
}

export type AssignOptionalEnrollPaymentPhasesSuccess = {
  success: true;
  message: string;
  assignedCount: number;
};

export type AssignOptionalEnrollPaymentPhasesFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type AssignOptionalEnrollPaymentPhasesResult =
  | AssignOptionalEnrollPaymentPhasesSuccess
  | AssignOptionalEnrollPaymentPhasesFailure;

export type TransferSppSuccess = {
  success: true;
  message: string;
  spp_id: string;
  from_payment_phase_id: string;
  to_payment_phase_id: string;
};

export type TransferSppFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type TransferSppResult = TransferSppSuccess | TransferSppFailure;
