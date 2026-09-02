import {
  PAYMENT_PHASE_STATUSES,
  STUDENT_PAYMENT_PHASE_STATUSES,
  type PaymentPhaseStatus,
  type StudentPaymentPhaseStatus,
} from "@/lib/manager/accounting/constants";
import { resolveInProgressClassForSemester } from "@/lib/manager/accounting/resolve-in-progress-class";
import {
  countsAsUpfrontPaid,
  isPhaseUpfrontWindowActive,
} from "@/lib/manager/accounting/upfront-window";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { createNavStepTimer } from "@/lib/debug/nav-timing";
import {
  STUDENT_STATUS_VALUES,
  STUDENT_STATUSES,
  type StudentStatusValue,
} from "@/lib/constants/manager-student-status";
import { cancelPaymentPhaseSchema } from "@/lib/validators/manager/cancel-payment-phase";
import { createPaymentPhaseSchema } from "@/lib/validators/manager/create-payment-phase";
import { assignOptionalEnrollPaymentPhasesSchema } from "@/lib/validators/manager/assign-optional-enroll-payment-phases";
import { repairMissingSppSchema } from "@/lib/validators/manager/repair-missing-spp";
import { transferSppSchema } from "@/lib/validators/manager/transfer-spp";
import { updatePaymentPhaseSchema } from "@/lib/validators/manager/update-payment-phase";
import type { PaymentPhaseListRecord } from "@/repositories/payment-phase.repository";
import * as classRepository from "@/repositories/class.repository";
import * as paymentPhaseRepository from "@/repositories/payment-phase.repository";
import * as profileRepository from "@/repositories/profile.repository";
import * as semesterRepository from "@/repositories/semester.repository";
import * as studentClassRepository from "@/repositories/student-class.repository";
import type { StudentPaymentPhaseRecord } from "@/repositories/student-payment-phase.repository";
import * as studentPaymentPhaseRepository from "@/repositories/student-payment-phase.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import { recalcNonCancelledSppsForPhase } from "@/services/accounting/accounting-recalc.service";
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
  ManagerBilledWithoutClassRow,
  ManagerMissingSppRow,
  ManagerPaymentPhaseRow,
  ManagerPaymentPhaseSemesterOption,
  ManagerSppRow,
  ManagerSppSemesterMismatchRow,
} from "@/types/manager-payment-phase";
import type { ManagerStudentWithoutActiveClassRow } from "@/types/manager-student";
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

function toPhaseListRecord(
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

function mapPhaseWriteError(
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
    upfront_window_active: isPhaseUpfrontWindowActive(record),
  };
}

async function buildBillingClassBySemesterId(
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

type SppCountPhase = Pick<
  PaymentPhaseListRecord,
  "id" | "status" | "start_date" | "upfront_amount"
>;

async function buildSppCountsByPhaseId(
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
    await studentPaymentPhaseRepository.listSppStatusRowsByPaymentPhaseIds(
      adminClient,
      phases.map((phase) => phase.id)
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

    const upfrontAmount = upfrontPhases.get(row.payment_phase_id);
    const isPaid =
      upfrontAmount === undefined
        ? row.status === STUDENT_PAYMENT_PHASE_STATUSES.PAID
        : countsAsUpfrontPaid({
            status: row.status,
            totalPaid: Number(row.total_paid),
            upfrontAmount,
          });

    if (isPaid) {
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

  const semesterIds = records.map((record) => record.semester_id);

  const [sppCounts, billingBySemester] = await Promise.all([
    buildSppCountsByPhaseId(adminClient, records),
    buildBillingClassBySemesterId(adminClient, semesterIds),
  ]);

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

/**
 * Transfer-dialog options: phase rows without SPP counts or billing-class
 * lookups. The accounting list remains the source of those extras.
 */
export async function listPaymentPhaseTransferOptionsForManager(
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

  return ((data ?? []) as PaymentPhaseListRecord[]).map((record) =>
    mapPhaseRecordToRow(record, 0, 0, null)
  );
}

export async function listMissingSppForOpenedPhases(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerMissingSppRow[]> {
  const phases = await listPaymentPhasesForManager(adminClient, actorUserId);
  const snapshot = await getAccountingExceptionsSnapshotForManager(
    adminClient,
    actorUserId,
    phases
  );
  return snapshot.missing;
}

export async function listSppSemesterMismatchForManager(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerSppSemesterMismatchRow[]> {
  const phases = await listPaymentPhasesForManager(adminClient, actorUserId);
  const snapshot = await getAccountingExceptionsSnapshotForManager(
    adminClient,
    actorUserId,
    phases
  );
  return snapshot.sppSemesterMismatches;
}

/**
 * Active non-cancelled SPPs on non-cancelled phases for students who are not
 * members of any in-progress class.
 */
export async function listStudentsBilledWithoutActiveClassForManager(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerBilledWithoutClassRow[]> {
  const phases = await listPaymentPhasesForManager(adminClient, actorUserId);
  const snapshot = await getAccountingExceptionsSnapshotForManager(
    adminClient,
    actorUserId,
    phases
  );
  return snapshot.billedWithoutClass;
}

export type AccountingExceptionsSnapshot = {
  missing: ManagerMissingSppRow[];
  withoutClassOrPhase: ManagerStudentWithoutActiveClassRow[];
  billedWithoutClass: ManagerBilledWithoutClassRow[];
  sppSemesterMismatches: ManagerSppSemesterMismatchRow[];
};

function mapStudentStatusValue(status: string | null): StudentStatusValue {
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

/**
 * One shared load for accounting exception panels (avoids 4× phase/SPP/class scans).
 * Prefer `phases` from the page list when already loaded.
 */
export async function getAccountingExceptionsSnapshotForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  phases: ManagerPaymentPhaseRow[]
): Promise<AccountingExceptionsSnapshot> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.ACCOUNTING_VIEW
  );

  const empty: AccountingExceptionsSnapshot = {
    missing: [],
    withoutClassOrPhase: [],
    billedWithoutClass: [],
    sppSemesterMismatches: [],
  };

  const nonCancelledPhases = phases.filter(
    (phase) => phase.status !== PAYMENT_PHASE_STATUSES.CANCELLED
  );
  const openedPhases = nonCancelledPhases.filter(
    (phase) => phase.status === PAYMENT_PHASE_STATUSES.OPENED
  );

  const phaseIds = nonCancelledPhases.map((phase) => phase.id);

  const [
    { data: inProgressClasses, error: classesError },
    sppResult,
  ] = await Promise.all([
    classRepository.listInProgressClassesWithSemester(adminClient),
    phaseIds.length === 0
      ? Promise.resolve({ data: [], error: null })
      : studentPaymentPhaseRepository.listSppsByPaymentPhaseIds(
          adminClient,
          phaseIds
        ),
  ]);

  if (classesError) {
    throw new Error(classesError.message);
  }
  if (sppResult.error) {
    throw new Error(sppResult.error.message);
  }

  const classes = inProgressClasses ?? [];
  const classIds = classes.map((row) => row.id);
  const phaseById = new Map(nonCancelledPhases.map((phase) => [phase.id, phase]));

  const membershipsResult =
    classIds.length === 0
      ? { data: [] as Array<{ user_id: string; class_id: string }>, error: null }
      : await studentClassRepository.listMemberUserIdsByClassIds(
          adminClient,
          classIds
        );

  if (membershipsResult.error) {
    throw new Error(membershipsResult.error.message);
  }

  const memberUserIds = new Set<string>();
  const enrolledByClassId = new Map<string, string[]>();
  const classById = new Map(
    classes.map((row) => [
      row.id,
      {
        id: row.id,
        name: row.name,
        semester_id: row.semester_id,
      },
    ])
  );

  const membershipsByStudent = new Map<
    string,
    Array<{ class_id: string; class_name: string; semester_id: string | null }>
  >();

  for (const row of membershipsResult.data ?? []) {
    memberUserIds.add(row.user_id);
    const list = enrolledByClassId.get(row.class_id) ?? [];
    list.push(row.user_id);
    enrolledByClassId.set(row.class_id, list);

    const classRow = classById.get(row.class_id);
    if (!classRow) {
      continue;
    }
    const memberships = membershipsByStudent.get(row.user_id) ?? [];
    memberships.push({
      class_id: classRow.id,
      class_name: classRow.name,
      semester_id: classRow.semester_id,
    });
    membershipsByStudent.set(row.user_id, memberships);
  }

  const {
    data: studentsWithoutProfiles,
    error: profilesError,
  } = await studentProfileRepository.listStudentProfilesExcludingUserIds(
    adminClient,
    [...memberUserIds]
  );

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  const sppRows = sppResult.data ?? [];
  const sppStudentsByPhaseId = new Map<string, Set<string>>();
  for (const row of sppRows) {
    const set = sppStudentsByPhaseId.get(row.payment_phase_id) ?? new Set();
    set.add(row.student_id);
    sppStudentsByPhaseId.set(row.payment_phase_id, set);
  }

  // --- Missing SPP (opened phases + billing class from page rows) ---
  const missingRaw: Array<{
    student_id: string;
    semester_id: string;
    semester_name: string;
    billing_class_id: string;
    billing_class_name: string;
    payment_phase_id: string;
    payment_phase_name: string;
  }> = [];

  for (const phase of openedPhases) {
    if (!phase.billing_class_id || !phase.billing_class_name) {
      continue;
    }
    const enrolled = enrolledByClassId.get(phase.billing_class_id) ?? [];
    const existing = sppStudentsByPhaseId.get(phase.id) ?? new Set();
    for (const studentId of enrolled) {
      if (existing.has(studentId)) {
        continue;
      }
      missingRaw.push({
        student_id: studentId,
        semester_id: phase.semester_id,
        semester_name: phase.semester_name,
        billing_class_id: phase.billing_class_id,
        billing_class_name: phase.billing_class_name,
        payment_phase_id: phase.id,
        payment_phase_name: phase.name,
      });
    }
  }

  // --- Students without in-progress class (already excluded enrolled) ---
  const studentsWithoutActiveClass = (studentsWithoutProfiles ?? [])
    .map((profile) => ({
      user_id: profile.user_id,
      student_profile_id: profile.id,
      full_name: profile.full_name,
      phone: profile.phone,
      status: mapStudentStatusValue(profile.status),
    }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name));

  // --- Billed without active class ---
  const billedSpps = sppRows.filter(
    (row) =>
      row.status !== STUDENT_PAYMENT_PHASE_STATUSES.CANCELLED &&
      !memberUserIds.has(row.student_id) &&
      phaseById.has(row.payment_phase_id)
  );

  // --- SPP / semester mismatches ---
  const activeSpps = sppRows.filter(
    (row) =>
      row.status !== STUDENT_PAYMENT_PHASE_STATUSES.CANCELLED &&
      phaseById.has(row.payment_phase_id)
  );

  const semesterIds = [
    ...new Set(
      [
        ...nonCancelledPhases.map((phase) => phase.semester_id),
        ...classes
          .map((row) => row.semester_id)
          .filter((id): id is string => Boolean(id)),
      ].filter(Boolean)
    ),
  ];

  const semesterNameById = new Map<string, string>();
  for (const phase of nonCancelledPhases) {
    semesterNameById.set(phase.semester_id, phase.semester_name);
  }

  if (semesterIds.some((id) => !semesterNameById.has(id))) {
    const { data: semesters, error: semesterError } =
      await semesterRepository.listSemesters(adminClient);
    if (semesterError) {
      throw new Error(semesterError.message);
    }
    const wanted = new Set(semesterIds);
    for (const semester of semesters ?? []) {
      if (wanted.has(semester.id) && !semesterNameById.has(semester.id)) {
        semesterNameById.set(semester.id, semester.name);
      }
    }
  }

  const mismatchesRaw: Array<{
    spp_id: string;
    student_id: string;
    payment_phase_id: string;
    payment_phase_name: string;
    phase_semester_id: string;
    phase_semester_name: string;
    current_class_id: string;
    current_class_name: string;
    current_semester_id: string | null;
    current_semester_name: string;
  }> = [];

  for (const spp of activeSpps) {
    const phase = phaseById.get(spp.payment_phase_id);
    if (!phase) {
      continue;
    }
    const memberships = membershipsByStudent.get(spp.student_id) ?? [];
    if (memberships.length === 0) {
      continue;
    }
    const matchesPhaseSemester = memberships.some(
      (membership) => membership.semester_id === phase.semester_id
    );
    if (matchesPhaseSemester) {
      continue;
    }
    const representative =
      memberships.find((membership) => membership.semester_id != null) ??
      memberships[0]!;
    mismatchesRaw.push({
      spp_id: spp.id,
      student_id: spp.student_id,
      payment_phase_id: phase.id,
      payment_phase_name: phase.name,
      phase_semester_id: phase.semester_id,
      phase_semester_name: phase.semester_name,
      current_class_id: representative.class_id,
      current_class_name: representative.class_name,
      current_semester_id: representative.semester_id,
      current_semester_name: representative.semester_id
        ? (semesterNameById.get(representative.semester_id) ?? "—")
        : "—",
    });
  }

  const labelStudentIds = [
    ...new Set([
      ...missingRaw.map((row) => row.student_id),
      ...billedSpps.map((row) => row.student_id),
      ...mismatchesRaw.map((row) => row.student_id),
    ]),
  ];

  const meta =
    labelStudentIds.length === 0
      ? new Map<
          string,
          { label: string; student_profile_id: string | null }
        >()
      : await buildStudentMetaByUserId(adminClient, labelStudentIds);

  const billedStudentIdsForDetails = [
    ...new Set(billedSpps.map((row) => row.student_id)),
  ];
  const billedProfilesResult =
    billedStudentIdsForDetails.length === 0
      ? { data: [] as Awaited<
          ReturnType<
            typeof studentProfileRepository.listStudentProfileDetailsByUserIds
          >
        >["data"], error: null }
      : await studentProfileRepository.listStudentProfileDetailsByUserIds(
          adminClient,
          billedStudentIdsForDetails
        );
  const { data: billedProfiles, error: billedProfilesError } =
    billedProfilesResult;

  if (billedProfilesError) {
    throw new Error(billedProfilesError.message);
  }

  const profileByUserId = new Map(
    (billedProfiles ?? []).map((profile) => [profile.user_id, profile])
  );

  const missing: ManagerMissingSppRow[] = missingRaw.map((row) => ({
    ...row,
    student_label: meta.get(row.student_id)?.label ?? row.student_id,
  }));

  const billedWithoutClass: ManagerBilledWithoutClassRow[] = billedSpps.map(
    (spp) => {
      const phase = phaseById.get(spp.payment_phase_id)!;
      const studentMeta = meta.get(spp.student_id);
      const profile = profileByUserId.get(spp.student_id);
      const rawStatus = profile?.status;
      const studentStatus =
        rawStatus &&
        (STUDENT_STATUS_VALUES as readonly string[]).includes(rawStatus)
          ? (rawStatus as StudentStatusValue)
          : null;

      return {
        spp_id: spp.id,
        student_id: spp.student_id,
        student_profile_id: studentMeta?.student_profile_id ?? null,
        student_label: studentMeta?.label ?? spp.student_id,
        student_status: studentStatus,
        phone: profile?.phone ?? null,
        payment_phase_id: phase.id,
        payment_phase_name: phase.name,
        phase_status: phase.status,
        spp_status: isStudentPaymentPhaseStatus(spp.status)
          ? spp.status
          : STUDENT_PAYMENT_PHASE_STATUSES.PENDING,
        phase_semester_id: phase.semester_id,
        phase_semester_name: phase.semester_name,
      };
    }
  );

  const sppSemesterMismatches: ManagerSppSemesterMismatchRow[] =
    mismatchesRaw.map((row) => {
      const studentMeta = meta.get(row.student_id);
      return {
        ...row,
        student_label: studentMeta?.label ?? row.student_id,
        student_profile_id: studentMeta?.student_profile_id ?? null,
      };
    });

  const billedStudentIds = new Set(
    billedWithoutClass.map((row) => row.student_id)
  );
  const withoutClassOrPhase = studentsWithoutActiveClass.filter(
    (row) => !billedStudentIds.has(row.user_id)
  );

  if (
    nonCancelledPhases.length === 0 &&
    studentsWithoutActiveClass.length === 0
  ) {
    return empty;
  }

  return {
    missing,
    withoutClassOrPhase,
    billedWithoutClass,
    sppSemesterMismatches,
  };
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

  const { data: semesters, error: semesterError } =
    await semesterRepository.listSemestersForPaymentPhasePicker(adminClient);

  if (semesterError) {
    throw new Error(semesterError.message);
  }

  return (semesters ?? [])
    .filter((row) => Boolean(row.semester_code?.trim()))
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
  const timer = createNavStepTimer("createPaymentPhase");
  try {
    const unauthorized = await timer.step("auth", () =>
      getUnauthorizedError(
        adminClient,
        actorUserId,
        PERMISSIONS.ACCOUNTING_PAYMENT_PHASES_CREATE
      )
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

    const { data, error: createError } = await timer.step("rpc", () =>
      paymentPhaseRepository.createPaymentPhaseWithSpps(adminClient, {
        name: name.trim(),
        semester_id,
        amount,
        upfront_amount,
        duration_months,
        start_date,
        end_date,
      })
    );

    if (createError) {
      return mapPhaseWriteError(
        createError.message,
        "Unable to create payment phase. Please try again."
      );
    }

    if (!data?.phase) {
      return {
        success: false,
        error: "Unable to create payment phase. Please try again.",
      };
    }

    const phase = data.phase;
    const sppCount = data.sppCount;
    const billingClass = data.billingClass;

    await timer.step("audit", () =>
      recordManagerAuditLog(adminClient, actor, {
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
          spp_count: sppCount,
          billing_class_id: billingClass?.id ?? null,
          note: "Payment phase created.",
        },
      })
    );

    return {
      success: true,
      phase: mapPhaseRecordToRow(
        toPhaseListRecord(phase, data.semester),
        sppCount,
        0,
        billingClass
      ),
      message: "Payment phase created.",
    };
  } finally {
    timer.end();
  }
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

  const { data, error } = await studentPaymentPhaseRepository.repairMissingSpp(
    adminClient,
    payment_phase_id,
    student_id
  );

  if (error) {
    return mapPhaseWriteError(
      error.message,
      "Unable to assign student payment phase. Please try again."
    );
  }

  if (!data) {
    return {
      success: false,
      error: "Unable to assign student payment phase. Please try again.",
    };
  }

  if (data.alreadyExisted && !data.reactivated) {
    return {
      success: true,
      message: "Student payment phase already exists.",
    };
  }

  if (!data.spp) {
    return {
      success: false,
      error: "Unable to assign student payment phase. Please try again.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: data.created ? "insert" : "update",
    severity: "info",
    table_name: "student_payment_phases",
    record_id: data.spp.id,
    new_data: {
      student_id: data.spp.student_id,
      payment_phase_id: data.spp.payment_phase_id,
      status: data.spp.status,
      original_amount: data.spp.original_amount,
      remaining_amount: data.spp.remaining_amount,
    },
    metadata: {
      note: data.created
        ? "Missing student payment phase repaired."
        : "Cancelled student payment phase reactivated.",
      payment_phase_id,
      phase_reopened: data.phaseReopened,
    },
  });

  if (data.phaseReopened) {
    await recordManagerAuditLog(adminClient, actor, {
      action: "update",
      severity: "info",
      table_name: "payment_phases",
      record_id: payment_phase_id,
      old_data: { status: PAYMENT_PHASE_STATUSES.CLOSED },
      new_data: { status: PAYMENT_PHASE_STATUSES.OPENED },
      metadata: {
        note: "Payment phase reopened after assigning an unpaid student.",
        student_id,
        payment_phase_id,
      },
    });
  }

  return {
    success: true,
    message: data.phaseReopened
      ? "Student payment phase assigned and phase reopened."
      : "Student payment phase assigned.",
  };
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

/**
 * After enroll auto-assign to the latest opened phase, optionally ensure SPPs
 * on other opened phases the manager selected.
 */
export async function assignOptionalEnrollPaymentPhasesForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    student_id: string;
    payment_phase_ids: string[];
  }
): Promise<AssignOptionalEnrollPaymentPhasesResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.ACCOUNTING_PAYMENT_PHASES_CREATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = assignOptionalEnrollPaymentPhasesSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const uniquePhaseIds = [...new Set(parsed.data.payment_phase_ids)];
  let assignedCount = 0;

  for (const payment_phase_id of uniquePhaseIds) {
    const result = await repairMissingSppForManager(
      adminClient,
      actorUserId,
      actor,
      {
        payment_phase_id,
        student_id: parsed.data.student_id,
      }
    );

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        fieldErrors: result.fieldErrors,
      };
    }

    assignedCount += 1;
  }

  return {
    success: true,
    assignedCount,
    message:
      assignedCount === 1
        ? "Student payment phase assigned."
        : `${assignedCount} student payment phases assigned.`,
  };
}

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

export async function transferStudentPaymentPhaseForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    spp_id: string;
    destination_payment_phase_id: string;
  }
): Promise<TransferSppResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.ACCOUNTING_SPP_TRANSFER
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = transferSppSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { spp_id, destination_payment_phase_id } = parsed.data;

  const { data, error } =
    await studentPaymentPhaseRepository.transferStudentPaymentPhase(
      adminClient,
      spp_id,
      destination_payment_phase_id
    );

  if (error) {
    return mapPhaseWriteError(
      error.message,
      "Unable to transfer student payment phase. Please try again."
    );
  }

  if (
    !data?.sppId ||
    !data.studentId ||
    !data.fromPaymentPhaseId ||
    !data.toPaymentPhaseId
  ) {
    return {
      success: false,
      error: "Unable to transfer student payment phase. Please try again.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "student_payment_phases",
    record_id: data.sppId,
    old_data: {
      payment_phase_id: data.fromPaymentPhaseId,
    },
    new_data: {
      payment_phase_id: data.toPaymentPhaseId,
    },
    metadata: {
      note: "SPP transferred between payment phases.",
      student_id: data.studentId,
      from_payment_phase_id: data.fromPaymentPhaseId,
      to_payment_phase_id: data.toPaymentPhaseId,
    },
  });

  return {
    success: true,
    message: "Student payment phase transferred.",
    spp_id: data.sppId,
    from_payment_phase_id: data.fromPaymentPhaseId,
    to_payment_phase_id: data.toPaymentPhaseId,
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

  const phaseRecord = data as PaymentPhaseListRecord;
  const [sppCounts, billingClass] = await Promise.all([
    buildSppCountsByPhaseId(adminClient, [phaseRecord]),
    resolveInProgressClassForSemester(adminClient, phaseRecord.semester_id),
  ]);
  const counts = sppCounts.get(phaseRecord.id) ?? { active: 0, paid: 0 };

  return mapPhaseRecordToRow(
    phaseRecord,
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

  const currentPhaseStatus = isPaymentPhaseStatus(updatedRecord.status)
    ? updatedRecord.status
    : PAYMENT_PHASE_STATUSES.OPENED;

  let sppRecalculated = 0;
  let nextPhaseStatus = currentPhaseStatus;

  try {
    const recalc = await recalcNonCancelledSppsForPhase(
      adminClient,
      updatedRecord.id
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

  const finalRecord =
    nextPhaseStatus !== currentPhaseStatus
      ? { ...updatedRecord, status: nextPhaseStatus }
      : updatedRecord;

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

  const sppCounts = await buildSppCountsByPhaseId(adminClient, [finalRecord]);
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

  const { data, error } = await paymentPhaseRepository.cancelPaymentPhase(
    adminClient,
    parsed.data.payment_phase_id
  );

  if (error) {
    return mapPhaseWriteError(
      error.message,
      "Unable to cancel payment phase. Please try again."
    );
  }

  if (!data?.phase) {
    return {
      success: false,
      error: "Unable to cancel payment phase. Please try again.",
    };
  }

  const cancelledRecord = toPhaseListRecord(data.phase, data.semester);

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "warning",
    table_name: "payment_phases",
    record_id: cancelledRecord.id,
    old_data: { status: data.previousStatus },
    new_data: { status: cancelledRecord.status },
    metadata: {
      note: "Payment phase cancelled.",
    },
  });

  return {
    success: true,
    phase: mapPhaseRecordToRow(
      cancelledRecord,
      data.sppActiveCount,
      data.sppPaidCount,
      data.billingClass
    ),
    message: "Payment phase cancelled.",
  };
}
