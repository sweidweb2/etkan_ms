import { PERMISSIONS } from "@/lib/constants/permissions";
import { resolveInProgressClassForSemester } from "@/lib/manager/accounting/resolve-in-progress-class";
import {
  PAYMENT_PHASE_STATUSES,
  STUDENT_PAYMENT_PHASE_STATUSES,
} from "@/lib/manager/accounting/constants";
import {
  STUDENT_STATUS_VALUES,
  type StudentStatusValue,
} from "@/lib/constants/manager-student-status";
import type { PaymentPhaseListRecord } from "@/repositories/payment-phase.repository";
import * as classRepository from "@/repositories/class.repository";
import * as paymentPhaseRepository from "@/repositories/payment-phase.repository";
import * as studentClassRepository from "@/repositories/student-class.repository";
import type { StudentPaymentPhaseRecord } from "@/repositories/student-payment-phase.repository";
import * as studentPaymentPhaseRepository from "@/repositories/student-payment-phase.repository";
import { assertPermission } from "@/services/auth/authorization.service";
import {
  buildBillingClassBySemesterId,
  buildSppCountsByPhaseId,
  buildStudentMetaByUserId,
  isStudentPaymentPhaseStatus,
  mapPhaseRecordToRow,
  mapSppRecordToRow,
  mapStudentStatusValue,
  type AccountingExceptionsSnapshot,
  type Supabase,
} from "@/services/accounting/payment-phase-shared";
import type {
  ManagerBilledWithoutClassRow,
  ManagerMissingSppRow,
  ManagerPaymentPhaseRow,
  ManagerPaymentPhaseSemesterOption,
  ManagerSppRow,
  ManagerSppSemesterMismatchRow,
} from "@/types/manager-payment-phase";
import * as semesterRepository from "@/repositories/semester.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";

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

  const [meta, clearances] = await Promise.all([
    buildStudentMetaByUserId(
      adminClient,
      [...new Set(records.map((record) => record.student_id))]
    ),
    import("@/services/accounting/spp-clearance.service").then(
      ({ loadActiveClearanceDtosBySppIds }) =>
        loadActiveClearanceDtosBySppIds(
          adminClient,
          records.map((record) => record.id)
        )
    ),
  ]);

  return records.map((record) => {
    const studentMeta = meta.get(record.student_id);
    return mapSppRecordToRow(
      record,
      studentMeta?.label ?? record.student_id,
      studentMeta?.student_profile_id ?? null,
      clearances.get(record.id) ?? null
    );
  });
}
