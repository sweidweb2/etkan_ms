import "server-only";

import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  assertPermission,
} from "@/services/auth/authorization.service";
import { STUDENT_STATUSES } from "@/lib/constants/manager-student-status";
import { createNavStepTimer } from "@/lib/debug/nav-timing";
import * as authRepository from "@/repositories/auth.repository";
import * as classRepository from "@/repositories/class.repository";
import * as paymentPhaseRepository from "@/repositories/payment-phase.repository";
import * as semesterDropRequestRepository from "@/repositories/semester-drop-request.repository";
import * as studentClassRepository from "@/repositories/student-class.repository";
import * as studentPaymentPhaseRepository from "@/repositories/student-payment-phase.repository";
import * as studentPaymentRepository from "@/repositories/student-payment.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import * as studentSemesterRepository from "@/repositories/student-semester.repository";
import { hydrateStudentRows } from "@/services/students/student.service";
import {
  CLASS_STATUS_VALUES,
  type ClassStatusValue,
} from "@/lib/constants/manager-class-status";
import { resolveActiveStudentDiff } from "@/services/classes/class-enrollment-diff.service";
import type {
  ManagerClassStudentRow,
  ManagerClassStudentsListData,
  ManagerClassStudentsListQuery,
} from "@/types/manager-class-student";
import { CLASS_STUDENTS_PAGE_SIZE } from "@/lib/constants/manager-class-student-display";
import type { StudentClassRecord } from "@/repositories/student-class.repository";
import type {
  ManagerAvailableStudentsData,
  ManagerAvailableStudentsQuery,
  ManagerStudentRow,
} from "@/types/manager-student";
import {
  isUuid,
  type Supabase,
} from "@/services/classes/class-shared";

export async function listClassStudentsForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string,
  options?: LoadClassStudentRowsOptions
): Promise<ManagerClassStudentRow[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.CLASSES_VIEW);
  return loadClassStudentRows(adminClient, classId, options);
}

export type LoadClassStudentRowsOptions = {
  /**
   * Resolve Auth emails (DB batch RPC, Auth Admin fallback for misses).
   * Teacher roster skips this — the student name is enough for search/display.
   * @default true
   */
  includeAuthEmails?: boolean;
  /**
   * Load pending-drop + semester SPP payment flags used for remove eligibility.
   * Grades / teacher paths can skip these extra queries.
   * @default true
   */
  includeRemoveEligibility?: boolean;
  /**
   * When set (including `null`), skip the class lookup used only to resolve
   * `semester_id` for remove-eligibility queries.
   */
  semesterId?: string | null;
};

async function hydrateClassStudentEnrollments(
  adminClient: Supabase,
  classId: string,
  enrollments: StudentClassRecord[],
  options?: LoadClassStudentRowsOptions
): Promise<ManagerClassStudentRow[]> {
  if (enrollments.length === 0) {
    return [];
  }

  const includeAuthEmails = options?.includeAuthEmails !== false;
  const includeRemoveEligibility = options?.includeRemoveEligibility !== false;
  const hasSemesterPreload = options?.semesterId !== undefined;
  const timer = createNavStepTimer("class_students_hydrate");

  try {
    const userIds = enrollments.map((row) => row.user_id);
    const userIdSet = new Set(userIds);
    const needsClassLookup =
      includeRemoveEligibility && !hasSemesterPreload;

    const [studentProfilesResult, emailResult, classResult] =
      await timer.step("profiles", () =>
        Promise.all([
          studentProfileRepository.listStudentProfileDetailsByUserIds(
            adminClient,
            userIds
          ),
          includeAuthEmails
            ? authRepository.listAuthEmailsByIds(adminClient, userIds)
            : Promise.resolve({
                data: new Map<string, string>(),
                error: null as Error | null,
              }),
          needsClassLookup
            ? classRepository.findClassById(adminClient, classId)
            : Promise.resolve({ data: null, error: null }),
        ])
      );

    if (studentProfilesResult.error) {
      throw new Error(studentProfilesResult.error.message);
    }

    if (emailResult.error) {
      throw new Error(emailResult.error.message);
    }

    if (needsClassLookup && classResult.error) {
      throw new Error(classResult.error.message);
    }

    const studentProfileByUserId = new Map(
      (studentProfilesResult.data ?? []).map((row) => [row.user_id, row])
    );
    const emailById = emailResult.data;
    const semesterId = includeRemoveEligibility
      ? hasSemesterPreload
        ? (options.semesterId ?? null)
        : (classResult.data?.semester_id ?? null)
      : null;

    const pendingDropByStudentId = new Map<string, string>();
    const studentsWithSppPayments = new Set<string>();

    if (includeRemoveEligibility) {
      const [pendingDropsResult, phaseResult] = await timer.step(
        "eligibility",
        () =>
          Promise.all([
            semesterId
              ? semesterDropRequestRepository.listPendingDropsBySemesterId(
                  adminClient,
                  semesterId
                )
              : semesterDropRequestRepository.listPendingDropsByStudentIds(
                  adminClient,
                  userIds
                ),
            semesterId
              ? paymentPhaseRepository.findCurrentSyncPhaseBySemesterId(
                  adminClient,
                  semesterId
                )
              : Promise.resolve({ data: null, error: null }),
          ])
      );

      if (pendingDropsResult.error) {
        throw new Error(pendingDropsResult.error.message);
      }

      for (const row of pendingDropsResult.data ?? []) {
        if (userIdSet.has(row.student_id)) {
          pendingDropByStudentId.set(row.student_id, row.id);
        }
      }

      if (phaseResult.error) {
        throw new Error(phaseResult.error.message);
      }

      if (semesterId) {
        const openedPhasesResult =
          await paymentPhaseRepository.listOpenedPaymentPhasesBySemesterId(
            adminClient,
            semesterId
          );
        if (openedPhasesResult.error) {
          throw new Error(openedPhasesResult.error.message);
        }
        let phases = openedPhasesResult.data ?? [];
        if (phases.length === 0 && phaseResult.data) {
          phases = [phaseResult.data];
        }
        for (const phase of phases) {
          const sppsResult =
            await studentPaymentPhaseRepository.listSppsByPhaseAndStudentIds(
              adminClient,
              phase.id,
              userIds
            );
          if (sppsResult.error) {
            throw new Error(sppsResult.error.message);
          }
          const sppsForRoster = sppsResult.data ?? [];
          const sppIds = sppsForRoster.map((row) => row.id);
          if (sppIds.length === 0) {
            continue;
          }
          const paymentsResult =
            await studentPaymentRepository.listPaymentSppIdsBySppIds(
              adminClient,
              sppIds
            );
          if (paymentsResult.error) {
            throw new Error(paymentsResult.error.message);
          }
          const paidSppIds = new Set(
            (paymentsResult.data ?? []).map(
              (row) => row.student_payment_phase_id
            )
          );
          for (const spp of sppsForRoster) {
            if (spp.status === "cancelled") {
              continue;
            }
            if (paidSppIds.has(spp.id)) {
              studentsWithSppPayments.add(spp.student_id);
            }
          }
        }
      }
    }

    const rows: ManagerClassStudentRow[] = [];

    for (const enrollment of enrollments) {
      const studentProfile = studentProfileByUserId.get(enrollment.user_id);
      const pendingDropId =
        pendingDropByStudentId.get(enrollment.user_id) ?? null;
      const hasSppPayments = studentsWithSppPayments.has(enrollment.user_id);
      const hasPendingDrop = Boolean(pendingDropId);

      rows.push({
        id: enrollment.id,
        student_profile_id: studentProfile?.id ?? "",
        user_id: enrollment.user_id,
        full_name: studentProfile?.full_name ?? "Unknown student",
        email: emailById.get(enrollment.user_id) ?? "",
        phone: studentProfile?.phone ?? null,
        joined_at: enrollment.joined_at ?? "",
        pending_drop_request_id: pendingDropId,
        has_pending_drop: hasPendingDrop,
        has_semester_spp_payments: hasSppPayments,
        can_remove_student: !hasSppPayments && !hasPendingDrop,
        is_team_leader: enrollment.is_team_leader,
      });
    }

    return rows;
  } finally {
    timer.end();
  }
}

/**
 * Same rows as `listClassStudentsForManager` without the permission check.
 * Only for callers that already asserted `CLASSES_VIEW` (and class scope, e.g.
 * teacher assignment) earlier in the same request.
 */
export async function loadClassStudentRows(
  adminClient: Supabase,
  classId: string,
  options?: LoadClassStudentRowsOptions
): Promise<ManagerClassStudentRow[]> {
  const timer = createNavStepTimer("class_students");
  try {
    const { data: enrollments, error } = await timer.step("enrollments", () =>
      studentClassRepository.listStudentClassesByClassId(adminClient, classId)
    );

    if (error) {
      throw new Error(error.message);
    }

    return hydrateClassStudentEnrollments(
      adminClient,
      classId,
      (enrollments ?? []) as StudentClassRecord[],
      options
    );
  } finally {
    timer.end();
  }
}

async function resolveClassStudentSearchUserIds(
  adminClient: Supabase,
  classId: string,
  search: string
): Promise<string[] | null> {
  const normalized = search.trim();
  if (!normalized) {
    return null;
  }

  const membersResult =
    await studentClassRepository.listMemberUserIdsByClassId(
      adminClient,
      classId
    );
  if (membersResult.error) {
    throw new Error(membersResult.error.message);
  }

  const memberIds = [
    ...new Set((membersResult.data ?? []).map((row) => row.user_id)),
  ];
  if (memberIds.length === 0) {
    return [];
  }

  if (normalized.includes("@")) {
    const { data: authUser, error } = await authRepository.findAuthUserByEmail(
      adminClient,
      normalized
    );
    if (error) {
      throw new Error(error.message);
    }
    const userId = authUser?.user?.id;
    return userId && memberIds.includes(userId) ? [userId] : [];
  }

  const matched =
    await studentProfileRepository.listStudentProfileUserIdsMatchingSearch(
      adminClient,
      memberIds,
      normalized
    );
  if (matched.error) {
    throw new Error(matched.error.message);
  }

  return [...new Set((matched.data ?? []).map((row) => row.user_id))];
}

/**
 * Server-paged class roster for the manager students tab.
 * Hydrates Auth emails + remove-eligibility only for the current page.
 */
export async function loadClassStudentsPage(
  adminClient: Supabase,
  classId: string,
  query: ManagerClassStudentsListQuery = {},
  options?: LoadClassStudentRowsOptions
): Promise<ManagerClassStudentsListData> {
  const pageSize = Math.min(
    50,
    Math.max(1, query.pageSize ?? CLASS_STUDENTS_PAGE_SIZE)
  );
  const requestedPage = Math.max(1, Math.floor(query.page ?? 1));
  const search = query.search?.trim() ?? "";

  const matchedUserIds = await resolveClassStudentSearchUserIds(
    adminClient,
    classId,
    search
  );

  const fetchPage = (page: number) =>
    studentClassRepository.listStudentClassesPageByClassId(adminClient, classId, {
      offset: (page - 1) * pageSize,
      limit: pageSize,
      userIds: matchedUserIds ?? undefined,
    });

  let pageResult = await fetchPage(requestedPage);
  if (pageResult.error) {
    throw new Error(pageResult.error.message);
  }

  let page = requestedPage;
  const totalCount = pageResult.count ?? 0;

  if (totalCount > 0 && (pageResult.data ?? []).length === 0) {
    page = Math.max(1, Math.ceil(totalCount / pageSize));
    pageResult = await fetchPage(page);
    if (pageResult.error) {
      throw new Error(pageResult.error.message);
    }
  }

  const students = await hydrateClassStudentEnrollments(
    adminClient,
    classId,
    (pageResult.data ?? []) as StudentClassRecord[],
    options
  );

  return {
    students,
    totalCount,
    page,
    pageSize,
    search,
  };
}

export async function listClassStudentsPageForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string,
  query: ManagerClassStudentsListQuery = {},
  options?: LoadClassStudentRowsOptions
): Promise<ManagerClassStudentsListData> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.CLASSES_VIEW);
  return loadClassStudentsPage(adminClient, classId, query, options);
}

export async function fetchClassStudentRowForManager(
  adminClient: Supabase,
  classId: string,
  userId: string
): Promise<ManagerClassStudentRow | null> {
  const { data: enrollment, error } =
    await studentClassRepository.findStudentClassByUserAndClass(
      adminClient,
      userId,
      classId
    );

  if (error) {
    throw new Error(error.message);
  }

  if (!enrollment) {
    return null;
  }

  const [studentProfilesResult, emailResult] = await Promise.all([
    studentProfileRepository.listStudentProfileDetailsByUserIds(
      adminClient,
      [userId]
    ),
    authRepository.listAuthEmailsByIds(adminClient, [userId]),
  ]);

  if (studentProfilesResult.error) {
    throw new Error(studentProfilesResult.error.message);
  }

  if (emailResult.error) {
    throw new Error(emailResult.error.message);
  }

  const studentProfile = studentProfilesResult.data?.[0];

  if (!studentProfile) {
    return null;
  }

  return {
    id: enrollment.id,
    student_profile_id: studentProfile.id,
    user_id: enrollment.user_id,
    full_name: studentProfile.full_name,
    email: emailResult.data.get(userId) ?? "",
    phone: studentProfile.phone,
    joined_at: enrollment.joined_at ?? "",
    is_team_leader: enrollment.is_team_leader,
  };
}

const AVAILABLE_STUDENTS_PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
const AVAILABLE_STUDENTS_PAGE_SIZE_DEFAULT = 25;

function clampAvailableStudentsPageSize(pageSize: number | undefined): number {
  if (
    pageSize !== undefined &&
    (AVAILABLE_STUDENTS_PAGE_SIZE_OPTIONS as readonly number[]).includes(
      pageSize
    )
  ) {
    return pageSize;
  }
  return AVAILABLE_STUDENTS_PAGE_SIZE_DEFAULT;
}

/**
 * Server-paged students available to enroll in a class (excludes current members).
 * Does not load the full student roster.
 */
export async function listAvailableStudentsForClass(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string,
  query: ManagerAvailableStudentsQuery = {}
): Promise<ManagerAvailableStudentsData> {
  const timer = createNavStepTimer("loadAvailableStudents");
  try {
    await timer.step("auth", () =>
      assertPermission(adminClient, actorUserId, PERMISSIONS.CLASSES_ADD_STUDENT)
    );

    const pageSize = clampAvailableStudentsPageSize(query.pageSize);
    const requestedPage = Math.max(1, Math.floor(query.page ?? 1));
    const search = query.search?.trim() ?? "";

    const [membershipResult, classResult] = await timer.step(
      "members+class",
      () =>
        Promise.all([
          studentClassRepository.listStudentUserIdsByClassId(
            adminClient,
            classId
          ),
          classRepository.findClassById(adminClient, classId),
        ])
    );

    if (membershipResult.error) {
      throw new Error(membershipResult.error.message);
    }
    if (classResult.error) {
      throw new Error(classResult.error.message);
    }

    const excludeUserIds = (membershipResult.data ?? []).map(
      (row) => row.user_id
    );
    const semesterId = classResult.data?.semester_id ?? null;

    const fetchPage = (page: number) =>
      studentProfileRepository.listStudentProfilesPage(adminClient, {
        offset: (page - 1) * pageSize,
        limit: pageSize,
        status: STUDENT_STATUSES.ACTIVE,
        search,
        excludeUserIds,
      });

    let pageResult = await timer.step("students", () =>
      fetchPage(requestedPage)
    );
    let page = requestedPage;

    if (pageResult.error) {
      throw new Error(pageResult.error.message);
    }

    const totalCount = pageResult.count ?? 0;

    if (totalCount > 0 && (pageResult.data ?? []).length === 0) {
      page = Math.max(1, Math.ceil(totalCount / pageSize));
      pageResult = await fetchPage(page);
      if (pageResult.error) {
        throw new Error(pageResult.error.message);
      }
    }

    let students = await hydrateStudentRows(
      adminClient,
      pageResult.data ?? []
    );

    if (semesterId && students.length > 0) {
      const withdrawnResult =
        await studentSemesterRepository.listWithdrawnStudentProfileIdsBySemester(
          adminClient,
          semesterId,
          students.map((student) => student.student_profile_id)
        );
      if (withdrawnResult.error) {
        throw new Error(withdrawnResult.error.message);
      }
      const withdrawnIds = new Set(withdrawnResult.data ?? []);
      students = students.map((student) =>
        withdrawnIds.has(student.student_profile_id)
          ? { ...student, semester_dropped: true }
          : student
      );
    }

    return { students, totalCount, page, pageSize };
  } finally {
    timer.end();
  }
}

export type ClassCopySourceOption = {
  id: string;
  name: string;
  status: ClassStatusValue;
};

export async function listSameSemesterClassesForCopy(
  adminClient: Supabase,
  actorUserId: string | null,
  targetClassId: string
): Promise<ClassCopySourceOption[]> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.CLASSES_COPY_STUDENTS_FROM_CLASS
  );

  if (!isUuid(targetClassId)) {
    return [];
  }

  const targetResult = await classRepository.findClassById(
    adminClient,
    targetClassId
  );

  if (targetResult.error) {
    throw new Error(targetResult.error.message);
  }

  const semesterId = targetResult.data?.semester_id;
  if (!semesterId) {
    return [];
  }

  const { data, error } = await classRepository.listClassesBySemesterId(
    adminClient,
    semesterId
  );

  if (error) {
    throw new Error(error.message);
  }

  const statusSet = new Set<string>(CLASS_STATUS_VALUES);

  return (data ?? [])
    .filter((row) => row.id !== targetClassId)
    .map((row) => ({
      id: row.id,
      name: row.name,
      status: (statusSet.has(row.status ?? "")
        ? row.status
        : CLASS_STATUS_VALUES[0]) as ClassStatusValue,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function listActiveStudentDiffFromClass(
  adminClient: Supabase,
  actorUserId: string | null,
  targetClassId: string,
  sourceClassId: string
): Promise<ManagerStudentRow[]> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.CLASSES_COPY_STUDENTS_FROM_CLASS
  );

  if (!isUuid(targetClassId) || !isUuid(sourceClassId)) {
    return [];
  }

  const result = await resolveActiveStudentDiff(
    adminClient,
    targetClassId,
    sourceClassId
  );

  if (!result.success) {
    throw new Error(result.error);
  }

  return result.students;
}
