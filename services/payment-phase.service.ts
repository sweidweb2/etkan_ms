import { STUDENT_CLASS_STATUSES } from "@/lib/constants/manager-student-class-status";
import {
  PAYMENT_PHASE_STATUSES,
  STUDENT_PAYMENT_PHASE_STATUSES,
  type PaymentPhaseStatus,
  type StudentPaymentPhaseStatus,
} from "@/lib/manager/accounting/constants";
import { resolveInProgressClassForSemester } from "@/lib/manager/accounting/resolve-in-progress-class";
import { buildInitialSppInsert } from "@/lib/manager/accounting/spp-insert";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { cancelPaymentPhaseSchema } from "@/lib/validators/manager/cancel-payment-phase";
import { createPaymentPhaseSchema } from "@/lib/validators/manager/create-payment-phase";
import { repairMissingSppSchema } from "@/lib/validators/manager/repair-missing-spp";
import { updatePaymentPhaseSchema } from "@/lib/validators/manager/update-payment-phase";
import type { PaymentPhaseListRecord } from "@/repositories/payment-phase.repository";
import * as paymentPhaseRepository from "@/repositories/payment-phase.repository";
import * as profileRepository from "@/repositories/profile.repository";
import * as semesterRepository from "@/repositories/semester.repository";
import * as studentClassRepository from "@/repositories/student-class.repository";
import type { StudentPaymentPhaseRecord } from "@/repositories/student-payment-phase.repository";
import * as studentPaymentPhaseRepository from "@/repositories/student-payment-phase.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import {
  recalcNonCancelledSppsForPhase,
  recalcPhaseStatusFromSpps,
} from "@/services/accounting-recalc.service";
import { ensureSppForStudentOnPhase } from "@/services/accounting-sync.service";
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
  ManagerMissingSppRow,
  ManagerPaymentPhaseRow,
  ManagerPaymentPhaseSemesterOption,
  ManagerSppRow,
} from "@/types/manager-payment-phase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

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

function mapPhaseRecordToRow(
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
  };
}

async function buildBillingClassBySemesterId(
  adminClient: Supabase,
  semesterIds: string[]
): Promise<Map<string, { id: string; name: string }>> {
  const map = new Map<string, { id: string; name: string }>();
  const unique = [...new Set(semesterIds.filter(Boolean))];

  await Promise.all(
    unique.map(async (semesterId) => {
      const billingClass = await resolveInProgressClassForSemester(
        adminClient,
        semesterId
      );
      if (billingClass) {
        map.set(semesterId, { id: billingClass.id, name: billingClass.name });
      }
    })
  );

  return map;
}

async function buildStudentMetaByUserId(
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

async function buildStudentLabelsByUserId(
  adminClient: Supabase,
  studentIds: string[]
): Promise<Map<string, string>> {
  const meta = await buildStudentMetaByUserId(adminClient, studentIds);
  const labels = new Map<string, string>();

  for (const [studentId, entry] of meta) {
    labels.set(studentId, entry.label);
  }

  return labels;
}

function mapSppRecordToRow(
  record: StudentPaymentPhaseRecord,
  studentLabel: string,
  studentProfileId: string | null
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
  };
}

async function buildSppCountsByPhaseId(
  adminClient: Supabase,
  phaseIds: string[]
): Promise<Map<string, { active: number; paid: number }>> {
  const counts = new Map<string, { active: number; paid: number }>();

  for (const phaseId of phaseIds) {
    counts.set(phaseId, { active: 0, paid: 0 });
  }

  if (phaseIds.length === 0) {
    return counts;
  }

  const { data, error } =
    await studentPaymentPhaseRepository.listSppsByPaymentPhaseIds(
      adminClient,
      phaseIds
    );

  if (error) {
    throw new Error(error.message);
  }

  for (const row of data ?? []) {
    const current = counts.get(row.payment_phase_id) ?? {
      active: 0,
      paid: 0,
    };

    if (row.status !== STUDENT_PAYMENT_PHASE_STATUSES.CANCELLED) {
      current.active += 1;
    }

    if (row.status === STUDENT_PAYMENT_PHASE_STATUSES.PAID) {
      current.paid += 1;
    }

    counts.set(row.payment_phase_id, current);
  }

  return counts;
}

export async function listPaymentPhasesForManager(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerPaymentPhaseRow[]> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.ACCOUNTING_VIEW
  );

  const { data, error } =
    await paymentPhaseRepository.listPaymentPhases(adminClient);

  if (error) {
    throw new Error(error.message);
  }

  const records = (data ?? []) as PaymentPhaseListRecord[];

  if (records.length === 0) {
    return [];
  }

  const sppCounts = await buildSppCountsByPhaseId(
    adminClient,
    records.map((record) => record.id)
  );

  const billingBySemester = await buildBillingClassBySemesterId(
    adminClient,
    records.map((record) => record.semester_id)
  );

  return records.map((record) => {
    const counts = sppCounts.get(record.id) ?? { active: 0, paid: 0 };
    return mapPhaseRecordToRow(
      record,
      counts.active,
      counts.paid,
      billingBySemester.get(record.semester_id) ?? null
    );
  });
}

export async function listMissingSppForOpenedPhases(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerMissingSppRow[]> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.ACCOUNTING_VIEW
  );

  const { data: openedPhases, error: openedError } =
    await paymentPhaseRepository.listOpenedPaymentPhases(adminClient);

  if (openedError) {
    throw new Error(openedError.message);
  }

  const phases = (openedPhases ?? []) as PaymentPhaseListRecord[];

  if (phases.length === 0) {
    return [];
  }

  const billingBySemester = await buildBillingClassBySemesterId(
    adminClient,
    phases.map((phase) => phase.semester_id)
  );

  const classIds = [
    ...new Set(
      [...billingBySemester.values()].map((billingClass) => billingClass.id)
    ),
  ];
  const phaseIds = phases.map((phase) => phase.id);

  if (classIds.length === 0) {
    return [];
  }

  const [
    { data: enrollments, error: enrollmentError },
    { data: existingSpps, error: sppError },
  ] = await Promise.all([
    studentClassRepository.listEnrolledUserIdsByClassIds(adminClient, classIds),
    studentPaymentPhaseRepository.listSppsByPaymentPhaseIds(
      adminClient,
      phaseIds
    ),
  ]);

  if (enrollmentError) {
    throw new Error(enrollmentError.message);
  }

  if (sppError) {
    throw new Error(sppError.message);
  }

  const enrolledByClassId = new Map<string, string[]>();
  for (const row of enrollments ?? []) {
    const list = enrolledByClassId.get(row.class_id) ?? [];
    list.push(row.user_id);
    enrolledByClassId.set(row.class_id, list);
  }

  const sppStudentsByPhaseId = new Map<string, Set<string>>();
  for (const row of existingSpps ?? []) {
    const set = sppStudentsByPhaseId.get(row.payment_phase_id) ?? new Set();
    set.add(row.student_id);
    sppStudentsByPhaseId.set(row.payment_phase_id, set);
  }

  const missing: Array<{
    student_id: string;
    semester_id: string;
    semester_name: string;
    billing_class_id: string;
    billing_class_name: string;
    payment_phase_id: string;
    payment_phase_name: string;
  }> = [];

  for (const phase of phases) {
    const billingClass = billingBySemester.get(phase.semester_id);
    if (!billingClass) {
      continue;
    }

    const enrolled = enrolledByClassId.get(billingClass.id) ?? [];
    const existing = sppStudentsByPhaseId.get(phase.id) ?? new Set();

    for (const studentId of enrolled) {
      if (existing.has(studentId)) {
        continue;
      }

      missing.push({
        student_id: studentId,
        semester_id: phase.semester_id,
        semester_name: phase.semesters?.name ?? "Unknown semester",
        billing_class_id: billingClass.id,
        billing_class_name: billingClass.name,
        payment_phase_id: phase.id,
        payment_phase_name: phase.name,
      });
    }
  }

  if (missing.length === 0) {
    return [];
  }

  const labels = await buildStudentLabelsByUserId(
    adminClient,
    [...new Set(missing.map((row) => row.student_id))]
  );

  return missing.map((row) => ({
    ...row,
    student_label: labels.get(row.student_id) ?? row.student_id,
  }));
}

export async function listPaymentPhaseSemesterOptionsForManager(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerPaymentPhaseSemesterOption[]> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.ACCOUNTING_VIEW
  );

  const [
    { data: semesters, error: semesterError },
    { data: opened, error: openedError },
  ] = await Promise.all([
    semesterRepository.listSemestersForPaymentPhasePicker(adminClient),
    paymentPhaseRepository.listOpenedPaymentPhaseSemesterIds(adminClient),
  ]);

  if (semesterError) {
    throw new Error(semesterError.message);
  }

  if (openedError) {
    throw new Error(openedError.message);
  }

  const openedSemesterIds = new Set(
    (opened ?? []).map((row) => row.semester_id)
  );

  return (semesters ?? [])
    .filter((row) => {
      const semesterCode = row.semester_code?.trim();
      return Boolean(semesterCode) && !openedSemesterIds.has(row.id);
    })
    .map((row) => {
      const semester_code = row.semester_code.trim();
      return {
        id: row.id,
        name: row.name,
        semester_code,
        label: `${row.name} · ${semester_code}`,
      };
    });
}

export async function createPaymentPhaseForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    name: string;
    semester_id: string;
    amount: number;
    upfront_amount: number;
    duration_months: number;
    start_date: string;
    end_date: string;
  }
): Promise<CreatePaymentPhaseResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.ACCOUNTING_PAYMENT_PHASES_CREATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = createPaymentPhaseSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const {
    name,
    semester_id,
    amount,
    upfront_amount,
    duration_months,
    start_date,
    end_date,
  } = parsed.data;

  const { data: semesterRow, error: semesterError } =
    await semesterRepository.findSemesterById(adminClient, semester_id);

  if (semesterError) {
    return {
      success: false,
      error: "Unable to create payment phase. Please try again.",
    };
  }

  if (!semesterRow) {
    return { success: false, error: "Semester not found." };
  }

  const semesterCode = semesterRow.semester_code?.trim();
  if (!semesterCode) {
    return {
      success: false,
      error: "This semester has no semester code.",
      fieldErrors: {
        semester_id: ["Semester must have a semester code."],
      },
    };
  }

  const { data: existingOpened, error: openedError } =
    await paymentPhaseRepository.findOpenedPaymentPhaseBySemesterId(
      adminClient,
      semester_id
    );

  if (openedError) {
    return {
      success: false,
      error: "Unable to create payment phase. Please try again.",
    };
  }

  if (existingOpened) {
    return {
      success: false,
      error: "This semester already has an opened payment phase.",
      fieldErrors: {
        semester_id: ["This semester already has an opened payment phase."],
      },
    };
  }

  const { data: phase, error: createError } =
    await paymentPhaseRepository.createPaymentPhase(adminClient, {
      name: name.trim(),
      semester_id,
      semester_code: semesterCode,
      amount,
      upfront_amount,
      duration_months,
      start_date,
      end_date,
      status: PAYMENT_PHASE_STATUSES.OPENED,
    });

  if (createError || !phase) {
    const message = createError?.message?.toLowerCase() ?? "";
    if (message.includes("unique") || message.includes("duplicate")) {
      return {
        success: false,
        error: "This semester already has an opened payment phase.",
        fieldErrors: {
          semester_id: ["This semester already has an opened payment phase."],
        },
      };
    }

    return {
      success: false,
      error: "Unable to create payment phase. Please try again.",
    };
  }

  const billingClass = await resolveInProgressClassForSemester(
    adminClient,
    semester_id
  );

  let enrolledUserIds: string[] = [];

  if (billingClass) {
    const { data: enrolledRows, error: enrolledError } =
      await studentClassRepository.listEnrolledUserIdsByClassId(
        adminClient,
        billingClass.id
      );

    if (enrolledError) {
      return {
        success: false,
        error:
          "Payment phase created, but enrolled students could not be loaded.",
      };
    }

    enrolledUserIds = [
      ...new Set((enrolledRows ?? []).map((row) => row.user_id)),
    ];
  }

  const assignedAt = new Date().toISOString();
  const sppInputs = enrolledUserIds.map((studentId) =>
    buildInitialSppInsert(studentId, phase.id, amount, assignedAt)
  );

  if (sppInputs.length > 0) {
    const { error: sppError } =
      await studentPaymentPhaseRepository.createStudentPaymentPhases(
        adminClient,
        sppInputs
      );

    if (sppError) {
      return {
        success: false,
        error:
          "Payment phase created, but student payment phases could not be assigned.",
      };
    }
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "info",
    table_name: "payment_phases",
    record_id: phase.id,
    new_data: {
      name: phase.name,
      semester_id: phase.semester_id,
      semester_code: phase.semester_code,
      amount: phase.amount,
      upfront_amount: phase.upfront_amount,
      duration_months: phase.duration_months,
      start_date: phase.start_date,
      end_date: phase.end_date,
      status: phase.status,
    },
    metadata: {
      spp_count: sppInputs.length,
      billing_class_id: billingClass?.id ?? null,
      note: "Payment phase created.",
    },
  });

  const phaseListRecord: PaymentPhaseListRecord = {
    ...(phase as PaymentPhaseListRecord),
    semesters: {
      id: semesterRow.id,
      name: semesterRow.name,
      semester_code: semesterCode,
    },
  };

  return {
    success: true,
    phase: mapPhaseRecordToRow(
      phaseListRecord,
      sppInputs.length,
      0,
      billingClass
        ? { id: billingClass.id, name: billingClass.name }
        : null
    ),
    message: "Payment phase created.",
  };
}

export async function repairMissingSppForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    payment_phase_id: string;
    student_id: string;
  }
): Promise<RepairMissingSppResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.ACCOUNTING_PAYMENT_PHASES_CREATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = repairMissingSppSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { payment_phase_id, student_id } = parsed.data;

  const { data: phase, error: phaseError } =
    await paymentPhaseRepository.findPaymentPhaseById(
      adminClient,
      payment_phase_id
    );

  if (phaseError) {
    return {
      success: false,
      error: "Unable to assign student payment phase. Please try again.",
    };
  }

  if (!phase) {
    return { success: false, error: "Payment phase not found." };
  }

  if (
    phase.status !== PAYMENT_PHASE_STATUSES.OPENED &&
    phase.status !== PAYMENT_PHASE_STATUSES.CLOSED
  ) {
    return {
      success: false,
      error: "Only opened or closed payment phases can receive assignments.",
    };
  }

  const { data: existingSpp, error: existingError } =
    await studentPaymentPhaseRepository.findSppByStudentAndPhase(
      adminClient,
      student_id,
      payment_phase_id
    );

  if (existingError) {
    return {
      success: false,
      error: "Unable to assign student payment phase. Please try again.",
    };
  }

  if (
    existingSpp &&
    existingSpp.status !== STUDENT_PAYMENT_PHASE_STATUSES.CANCELLED
  ) {
    return {
      success: true,
      message: "Student payment phase already exists.",
    };
  }

  const billingClass = await resolveInProgressClassForSemester(
    adminClient,
    phase.semester_id
  );

  if (!billingClass) {
    return {
      success: false,
      error: "No in-progress class found for this semester.",
    };
  }

  const { data: enrollment, error: enrollmentError } =
    await studentClassRepository.findStudentClassByUserAndClass(
      adminClient,
      student_id,
      billingClass.id
    );

  if (enrollmentError) {
    return {
      success: false,
      error: "Unable to assign student payment phase. Please try again.",
    };
  }

  if (!enrollment || enrollment.status !== STUDENT_CLASS_STATUSES.ENROLLED) {
    return {
      success: false,
      error: "Student is not enrolled in this semester's in-progress class.",
    };
  }

  const wasClosed = phase.status === PAYMENT_PHASE_STATUSES.CLOSED;

  let ensured;
  try {
    ensured = await ensureSppForStudentOnPhase(adminClient, {
      studentId: student_id,
      phase: {
        id: phase.id,
        name: phase.name,
        semester_id: phase.semester_id,
        semester_code: phase.semester_code,
        amount: Number(phase.amount),
        upfront_amount: Number(phase.upfront_amount),
        duration_months: phase.duration_months,
        start_date: phase.start_date,
        end_date: phase.end_date,
        status: phase.status,
        created_at: phase.created_at,
        updated_at: phase.updated_at,
      },
    });
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Unable to assign student payment phase. Please try again.",
    };
  }

  if (ensured.alreadyExisted && !ensured.reactivated) {
    return {
      success: true,
      message: "Student payment phase already exists.",
    };
  }

  if (!ensured.spp) {
    return {
      success: false,
      error: "Unable to assign student payment phase. Please try again.",
    };
  }

  let phaseReopened = false;
  const shouldReopenPhase =
    wasClosed && (ensured.created || ensured.reactivated);

  if (shouldReopenPhase) {
    const { error: reopenError } =
      await paymentPhaseRepository.updatePaymentPhaseStatus(
        adminClient,
        phase.id,
        PAYMENT_PHASE_STATUSES.OPENED
      );

    if (reopenError) {
      return {
        success: false,
        error: "Student was assigned, but the phase could not be reopened.",
      };
    }

    phaseReopened = true;
  }

  try {
    await recalcPhaseStatusFromSpps(adminClient, phase.id);
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Student was assigned, but phase status could not be recalculated.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: ensured.created ? "insert" : "update",
    severity: "info",
    table_name: "student_payment_phases",
    record_id: ensured.spp.id,
    new_data: {
      student_id: ensured.spp.student_id,
      payment_phase_id: ensured.spp.payment_phase_id,
      status: ensured.spp.status,
      original_amount: ensured.spp.original_amount,
      remaining_amount: ensured.spp.remaining_amount,
    },
    metadata: {
      note: ensured.created
        ? "Missing student payment phase repaired."
        : "Cancelled student payment phase reactivated.",
      payment_phase_id,
      phase_reopened: phaseReopened,
    },
  });

  if (phaseReopened) {
    await recordManagerAuditLog(adminClient, actor, {
      action: "update",
      severity: "info",
      table_name: "payment_phases",
      record_id: phase.id,
      old_data: { status: PAYMENT_PHASE_STATUSES.CLOSED },
      new_data: { status: PAYMENT_PHASE_STATUSES.OPENED },
      metadata: {
        note: "Payment phase reopened after assigning an unpaid student.",
        student_id,
        payment_phase_id: phase.id,
      },
    });
  }

  return {
    success: true,
    message: phaseReopened
      ? "Student payment phase assigned and phase reopened."
      : "Student payment phase assigned.",
  };
}

export async function getPaymentPhaseForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  phaseId: string
): Promise<ManagerPaymentPhaseRow | null> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.ACCOUNTING_VIEW
  );

  const { data, error } = await paymentPhaseRepository.findPaymentPhaseById(
    adminClient,
    phaseId
  );

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const record = data as PaymentPhaseListRecord;
  const sppCounts = await buildSppCountsByPhaseId(adminClient, [record.id]);
  const counts = sppCounts.get(record.id) ?? { active: 0, paid: 0 };
  const billingClass = await resolveInProgressClassForSemester(
    adminClient,
    record.semester_id
  );

  return mapPhaseRecordToRow(
    record,
    counts.active,
    counts.paid,
    billingClass
      ? { id: billingClass.id, name: billingClass.name }
      : null
  );
}

export async function listSppsForPhaseForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  phaseId: string
): Promise<ManagerSppRow[]> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.ACCOUNTING_VIEW
  );

  const { data, error } =
    await studentPaymentPhaseRepository.listSppsByPaymentPhaseId(
      adminClient,
      phaseId
    );

  if (error) {
    throw new Error(error.message);
  }

  const records = (data ?? []) as StudentPaymentPhaseRecord[];

  if (records.length === 0) {
    return [];
  }

  const meta = await buildStudentMetaByUserId(
    adminClient,
    [...new Set(records.map((record) => record.student_id))]
  );

  return records.map((record) => {
    const studentMeta = meta.get(record.student_id);
    return mapSppRecordToRow(
      record,
      studentMeta?.label ?? record.student_id,
      studentMeta?.student_profile_id ?? null
    );
  });
}

export async function updatePaymentPhaseForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    id: string;
    name: string;
    amount: number;
    upfront_amount: number;
    duration_months: number;
    start_date: string;
    end_date: string;
  }
): Promise<UpdatePaymentPhaseResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.ACCOUNTING_PAYMENT_PHASES_UPDATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = updatePaymentPhaseSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const existing = await paymentPhaseRepository.findPaymentPhaseById(
    adminClient,
    parsed.data.id
  );

  if (existing.error) {
    return {
      success: false,
      error: "Unable to update payment phase. Please try again.",
    };
  }

  if (!existing.data) {
    return { success: false, error: "Payment phase not found." };
  }

  const existingRecord = existing.data as PaymentPhaseListRecord;

  if (existingRecord.status === PAYMENT_PHASE_STATUSES.CANCELLED) {
    return {
      success: false,
      error: "Cancelled payment phases cannot be edited.",
    };
  }

  const oldData = {
    name: existingRecord.name,
    amount: existingRecord.amount,
    upfront_amount: existingRecord.upfront_amount,
    duration_months: existingRecord.duration_months,
    start_date: existingRecord.start_date,
    end_date: existingRecord.end_date,
    status: existingRecord.status,
  };

  const { data: updated, error: updateError } =
    await paymentPhaseRepository.updatePaymentPhase(
      adminClient,
      parsed.data.id,
      {
        name: parsed.data.name.trim(),
        amount: parsed.data.amount,
        upfront_amount: parsed.data.upfront_amount,
        duration_months: parsed.data.duration_months,
        start_date: parsed.data.start_date,
        end_date: parsed.data.end_date,
      }
    );

  if (updateError || !updated) {
    return {
      success: false,
      error: "Unable to update payment phase. Please try again.",
    };
  }

  const updatedRecord = updated as PaymentPhaseListRecord;

  const { data: spps, error: sppError } =
    await studentPaymentPhaseRepository.listSppsByPaymentPhaseId(
      adminClient,
      updatedRecord.id
    );

  if (sppError) {
    return {
      success: false,
      error:
        "Payment phase updated, but student payment phases could not be recalculated.",
    };
  }

  const currentPhaseStatus = isPaymentPhaseStatus(updatedRecord.status)
    ? updatedRecord.status
    : PAYMENT_PHASE_STATUSES.OPENED;

  let sppRecalculated = 0;
  let nextPhaseStatus = currentPhaseStatus;

  try {
    const recalc = await recalcNonCancelledSppsForPhase(
      adminClient,
      parsed.data.amount,
      currentPhaseStatus,
      (spps ?? []) as StudentPaymentPhaseRecord[]
    );
    sppRecalculated = recalc.sppRecalculated;
    nextPhaseStatus = recalc.nextPhaseStatus;
  } catch {
    return {
      success: false,
      error:
        "Payment phase updated, but student payment phases could not be recalculated.",
    };
  }

  let finalRecord = updatedRecord;

  if (nextPhaseStatus !== currentPhaseStatus) {
    const { data: statusUpdated, error: statusError } =
      await paymentPhaseRepository.updatePaymentPhaseStatus(
        adminClient,
        updatedRecord.id,
        nextPhaseStatus
      );

    if (statusError || !statusUpdated) {
      return {
        success: false,
        error:
          "Payment phase updated, but phase status could not be recalculated.",
      };
    }

    finalRecord = statusUpdated as PaymentPhaseListRecord;
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "payment_phases",
    record_id: finalRecord.id,
    old_data: oldData,
    new_data: {
      name: finalRecord.name,
      amount: finalRecord.amount,
      upfront_amount: finalRecord.upfront_amount,
      duration_months: finalRecord.duration_months,
      start_date: finalRecord.start_date,
      end_date: finalRecord.end_date,
      status: finalRecord.status,
    },
    metadata: {
      spp_recalculated: sppRecalculated,
      note: "Payment phase updated.",
    },
  });

  const sppCounts = await buildSppCountsByPhaseId(adminClient, [
    finalRecord.id,
  ]);
  const counts = sppCounts.get(finalRecord.id) ?? { active: 0, paid: 0 };
  const billingClass = await resolveInProgressClassForSemester(
    adminClient,
    finalRecord.semester_id
  );

  return {
    success: true,
    phase: mapPhaseRecordToRow(
      finalRecord,
      counts.active,
      counts.paid,
      billingClass
        ? { id: billingClass.id, name: billingClass.name }
        : null
    ),
    message: "Payment phase updated.",
  };
}

export async function cancelPaymentPhaseForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    payment_phase_id: string;
  }
): Promise<CancelPaymentPhaseResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.ACCOUNTING_PAYMENT_PHASES_CANCEL
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = cancelPaymentPhaseSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const existing = await paymentPhaseRepository.findPaymentPhaseById(
    adminClient,
    parsed.data.payment_phase_id
  );

  if (existing.error) {
    return {
      success: false,
      error: "Unable to cancel payment phase. Please try again.",
    };
  }

  if (!existing.data) {
    return { success: false, error: "Payment phase not found." };
  }

  const existingRecord = existing.data as PaymentPhaseListRecord;

  if (existingRecord.status === PAYMENT_PHASE_STATUSES.CANCELLED) {
    return {
      success: false,
      error: "This payment phase is already cancelled.",
    };
  }

  const { data: cancelled, error: cancelError } =
    await paymentPhaseRepository.updatePaymentPhaseStatus(
      adminClient,
      existingRecord.id,
      PAYMENT_PHASE_STATUSES.CANCELLED
    );

  if (cancelError || !cancelled) {
    return {
      success: false,
      error: "Unable to cancel payment phase. Please try again.",
    };
  }

  const cancelledRecord = cancelled as PaymentPhaseListRecord;

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "warning",
    table_name: "payment_phases",
    record_id: cancelledRecord.id,
    old_data: { status: existingRecord.status },
    new_data: { status: cancelledRecord.status },
    metadata: {
      note: "Payment phase cancelled.",
    },
  });

  const sppCounts = await buildSppCountsByPhaseId(adminClient, [
    cancelledRecord.id,
  ]);
  const counts = sppCounts.get(cancelledRecord.id) ?? { active: 0, paid: 0 };
  const billingClass = await resolveInProgressClassForSemester(
    adminClient,
    cancelledRecord.semester_id
  );

  return {
    success: true,
    phase: mapPhaseRecordToRow(
      cancelledRecord,
      counts.active,
      counts.paid,
      billingClass
        ? { id: billingClass.id, name: billingClass.name }
        : null
    ),
    message: "Payment phase cancelled.",
  };
}
