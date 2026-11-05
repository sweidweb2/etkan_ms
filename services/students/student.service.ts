import "server-only";

import { unstable_cache } from "next/cache";
import { CLASS_STATUSES, type ClassStatusValue } from "@/lib/constants/manager-class-status";
import { STUDENT_STATUSES } from "@/lib/constants/manager-student-status";
import type { StudentStatusValue } from "@/lib/constants/manager-student-status";
import { ROLES, ROLE_VALUES, type RoleValue } from "@/lib/constants/roles";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { createNavStepTimer } from "@/lib/debug/nav-timing";
import {
  assertPermission,
  assertStudentSelfAccess,
  getUnauthorizedError,
} from "@/services/auth/authorization.service";
import { MANAGER_CACHE_TAGS } from "@/lib/cache/manager-list-cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/services/classes/class-shared";
import {
  createStudentSchema,
  resolveCreateStudentInput,
} from "@/lib/validators/manager/create-student";
import { updateStudentSchema } from "@/lib/validators/manager/update-student";
import * as authRepository from "@/repositories/auth.repository";
import * as classRepository from "@/repositories/class.repository";
import * as profileRepository from "@/repositories/profile.repository";
import * as studentClassRepository from "@/repositories/student-class.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import * as studentTaskRepository from "@/repositories/student-task.repository";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import { ensureStudentRegistration } from "@/services/auth/profile.service";
import { syncAuthUserRole } from "@/services/auth/role.service";
import type { FieldErrors } from "@/types/auth";
import type {
  ManagerStudentDetailStats,
  ManagerStudentRow,
  ManagerStudentsListData,
  ManagerStudentsListQuery,
  ManagerStudentWithoutActiveClassRow,
} from "@/types/manager-student";
import type { ManagerStudentClassRow } from "@/types/manager-student-class";
import type { ManagerClassOption } from "@/types/manager-class";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

type StudentWelcomeEmailPayload = {
  email: string;
  password: string;
  fullName: string;
};

export type CreateStudentSuccess = {
  success: true;
  student: ManagerStudentRow;
  message: string;
};

export type CreateStudentFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type CreateStudentResult = CreateStudentSuccess | CreateStudentFailure;

export type UpdateStudentSuccess = {
  success: true;
  student: ManagerStudentRow;
  message: string;
};

export type UpdateStudentFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type UpdateStudentResult = UpdateStudentSuccess | UpdateStudentFailure;

function mapCreateStudentError(message: string): string {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("already registered") ||
    normalized.includes("already exists") ||
    (normalized.includes("email") && normalized.includes("already"))
  ) {
    return "An account with this email already exists.";
  }

  if (normalized.includes("password")) {
    return "Password does not meet requirements.";
  }

  return "Unable to create student. Please try again.";
}

function mapUpdateStudentError(message: string): string {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("already registered") ||
    normalized.includes("already exists") ||
    (normalized.includes("email") && normalized.includes("already"))
  ) {
    return "That email is already in use.";
  }

  return "Unable to update student. Please try again.";
}

function normalizeOptionalString(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function mapStudentStatus(status: string | null): StudentStatusValue {
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

function mapProfileRole(role: string | null | undefined): RoleValue {
  const match = ROLE_VALUES.find((value) => value === role);
  return match ?? ROLES.STUDENT;
}

/** Phase 2: send welcome email with account credentials. */
async function notifyStudentCreated(
  payload: StudentWelcomeEmailPayload
): Promise<void> {
  void payload;
  // Intentionally no-op until email infrastructure is added.
}

async function mapStudentProfileToManagerStudentRow(
  adminClient: Supabase,
  studentProfile: {
    id: string;
    user_id: string;
    full_name: string;
    birth_date: string | null;
    phone: string | null;
    status: string | null;
    created_at: string | null;
  },
  profile?:
    | {
        created_at: string | null;
        role?: string | null;
        is_instructor?: boolean | null;
      }
    | null,
  email?: string | null
): Promise<ManagerStudentRow | null> {
  let resolvedProfile = profile;
  let resolvedEmail = email;

  if (resolvedProfile === undefined || resolvedEmail === undefined) {
    const [profileResult, emailsResult] = await Promise.all([
      profileRepository.findProfileById(adminClient, studentProfile.user_id),
      authRepository.listAuthEmailsByIds(adminClient, [studentProfile.user_id]),
    ]);

    if (profileResult.error || !profileResult.data) {
      return null;
    }
    if (emailsResult.error) {
      return null;
    }

    resolvedProfile = profileResult.data;
    resolvedEmail = emailsResult.data.get(studentProfile.user_id) ?? "";
  }

  if (!resolvedProfile) {
    return null;
  }

  return {
    user_id: studentProfile.user_id,
    student_profile_id: studentProfile.id,
    email: resolvedEmail ?? "",
    full_name: studentProfile.full_name,
    birth_date: studentProfile.birth_date,
    phone: studentProfile.phone,
    status: mapStudentStatus(studentProfile.status),
    created_at:
      studentProfile.created_at ??
      resolvedProfile.created_at ??
      new Date(0).toISOString(),
    role: mapProfileRole(resolvedProfile.role),
    is_instructor: resolvedProfile.is_instructor ?? false,
  };
}

type StudentProfileListRecord = {
  id: string;
  user_id: string;
  full_name: string;
  birth_date: string | null;
  phone: string | null;
  status: string | null;
  created_at: string | null;
};

/** Hydrates student_profiles rows with profiles + auth emails (only for the given rows). */
async function hydrateStudentRows(
  adminClient: Supabase,
  studentProfiles: StudentProfileListRecord[]
): Promise<ManagerStudentRow[]> {
  if (!studentProfiles.length) {
    return [];
  }

  const userIds = studentProfiles.map((row) => row.user_id);
  const [profilesResult, emailsResult] = await Promise.all([
    profileRepository.listProfilesByIds(adminClient, userIds),
    authRepository.listAuthEmailsByIds(adminClient, userIds),
  ]);

  if (profilesResult.error) {
    throw new Error(profilesResult.error.message);
  }
  if (emailsResult.error) {
    throw new Error(emailsResult.error.message);
  }

  const profileById = new Map(
    (profilesResult.data ?? []).map((row) => [row.id, row])
  );
  const emailById = emailsResult.data;

  const students: ManagerStudentRow[] = [];

  for (const studentProfile of studentProfiles) {
    const profile = profileById.get(studentProfile.user_id);
    if (!profile) {
      continue;
    }

    students.push({
      user_id: studentProfile.user_id,
      student_profile_id: studentProfile.id,
      email: emailById.get(studentProfile.user_id) ?? "",
      full_name: studentProfile.full_name,
      birth_date: studentProfile.birth_date,
      phone: studentProfile.phone,
      status: mapStudentStatus(studentProfile.status),
      created_at:
        studentProfile.created_at ??
        profile.created_at ??
        new Date(0).toISOString(),
      role: mapProfileRole(profile.role),
      is_instructor: profile.is_instructor ?? false,
    });
  }

  return students;
}

async function fetchStudentsForManager(
  adminClient: Supabase
): Promise<ManagerStudentRow[]> {
  const { data: studentProfiles, error } =
    await studentProfileRepository.listStudentProfiles(adminClient);

  if (error) {
    throw new Error(error.message);
  }

  return hydrateStudentRows(adminClient, studentProfiles ?? []);
}

const listStudentsForManagerCached = unstable_cache(
  async () => {
    const adminClient = createSupabaseAdminClient();
    return fetchStudentsForManager(adminClient);
  },
  ["manager-students-list"],
  { tags: [MANAGER_CACHE_TAGS.STUDENTS], revalidate: 3600 }
);

/**
 * Lists all students for the manager panel.
 * Auth is checked outside the cache; the list body is shared-server-cached.
 * The `adminClient` argument is kept for call-site compatibility; the cached
 * path creates its own admin client inside `unstable_cache`.
 */
export async function listStudentsForManager(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerStudentRow[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.STUDENTS_VIEW);
  return listStudentsForManagerCached();
}

const STUDENTS_PAGE_SIZE_OPTIONS = [5, 10, 25] as const;
const STUDENTS_PAGE_SIZE_DEFAULT = 10;

function clampStudentsPageSize(pageSize: number | undefined): number {
  if (
    pageSize !== undefined &&
    (STUDENTS_PAGE_SIZE_OPTIONS as readonly number[]).includes(pageSize)
  ) {
    return pageSize;
  }
  return STUDENTS_PAGE_SIZE_DEFAULT;
}

/**
 * Server-paged students list for the manager panel (never loads the full roster).
 * Search matches student_profiles.full_name / phone (and user_id for a pasted UUID).
 * Email is not searchable here: auth emails live outside Postgres tables.
 */
export async function listStudentsPageForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  query: ManagerStudentsListQuery = {}
): Promise<ManagerStudentsListData> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.STUDENTS_VIEW);

  const pageSize = clampStudentsPageSize(query.pageSize);
  const requestedPage = Math.max(1, Math.floor(query.page ?? 1));
  const status = query.status ?? null;
  const search = query.search?.trim() ?? "";

  const fetchPage = (page: number) =>
    studentProfileRepository.listStudentProfilesPage(adminClient, {
      offset: (page - 1) * pageSize,
      limit: pageSize,
      status,
      search,
    });

  const [initialPageResult, countsResult] = await Promise.all([
    fetchPage(requestedPage),
    studentProfileRepository.countStudentProfilesByStatus(adminClient, [
      STUDENT_STATUSES.ACTIVE,
      STUDENT_STATUSES.INACTIVE,
      STUDENT_STATUSES.SUSPENDED,
    ]),
  ]);

  let pageResult = initialPageResult;
  let page = requestedPage;

  if (pageResult.error) {
    throw new Error(pageResult.error.message);
  }
  if (countsResult.error) {
    throw new Error(countsResult.error.message);
  }

  const totalCount = pageResult.count ?? 0;

  // Requested page is past the end (e.g. rows were removed): fall back to the last page.
  if (totalCount > 0 && (pageResult.data ?? []).length === 0) {
    page = Math.max(1, Math.ceil(totalCount / pageSize));
    pageResult = await fetchPage(page);
    if (pageResult.error) {
      throw new Error(pageResult.error.message);
    }
  }

  const students = await hydrateStudentRows(
    adminClient,
    pageResult.data ?? []
  );

  return {
    students,
    totalCount,
    page,
    pageSize,
    stats: {
      total: countsResult.total,
      active: countsResult.byStatus[STUDENT_STATUSES.ACTIVE] ?? 0,
      inactive: countsResult.byStatus[STUDENT_STATUSES.INACTIVE] ?? 0,
      suspended: countsResult.byStatus[STUDENT_STATUSES.SUSPENDED] ?? 0,
    },
  };
}

type StudentsWithoutActiveClassViewPermission =
  | typeof PERMISSIONS.ACCOUNTING_VIEW
  | typeof PERMISSIONS.CLASSES_VIEW;

/**
 * Students who are not currently members of any class with status in_progress.
 * Binary membership: any `student_class` row on an in-progress class counts.
 */
export async function listStudentsWithoutInProgressClassForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  viewPermission: StudentsWithoutActiveClassViewPermission
): Promise<ManagerStudentWithoutActiveClassRow[]> {
  await assertPermission(adminClient, actorUserId, viewPermission);

  const [
    { data: studentProfiles, error: profilesError },
    { data: inProgressClasses, error: classesError },
  ] = await Promise.all([
    studentProfileRepository.listStudentProfiles(adminClient),
    classRepository.listInProgressClasses(adminClient),
  ]);

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  if (classesError) {
    throw new Error(classesError.message);
  }

  const profiles = studentProfiles ?? [];
  if (profiles.length === 0) {
    return [];
  }

  const inProgressClassIds = (inProgressClasses ?? []).map(
    (classRow) => classRow.id
  );

  const enrolledUserIds = new Set<string>();

  if (inProgressClassIds.length > 0) {
    const { data: enrollments, error: enrollmentError } =
      await studentClassRepository.listMemberUserIdsByClassIds(
        adminClient,
        inProgressClassIds
      );

    if (enrollmentError) {
      throw new Error(enrollmentError.message);
    }

    for (const row of enrollments ?? []) {
      enrolledUserIds.add(row.user_id);
    }
  }

  return profiles
    .filter((profile) => !enrolledUserIds.has(profile.user_id))
    .map((profile) => ({
      user_id: profile.user_id,
      student_profile_id: profile.id,
      full_name: profile.full_name,
      phone: profile.phone,
      status: mapStudentStatus(profile.status),
    }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name));
}

export async function getStudentForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  studentProfileId: string
): Promise<ManagerStudentRow | null> {
  const timer = createNavStepTimer("getStudent");
  try {
    await timer.step("auth", () =>
      assertPermission(adminClient, actorUserId, PERMISSIONS.STUDENTS_VIEW)
    );

    const { data: studentProfile, error } = await timer.step("profile", () =>
      studentProfileRepository.findStudentProfileById(
        adminClient,
        studentProfileId
      )
    );

    if (error) {
      throw new Error(error.message);
    }

    if (!studentProfile) {
      return null;
    }

    const [profileResult, emailsResult] = await timer.step("map", () =>
      Promise.all([
        profileRepository.findProfileById(adminClient, studentProfile.user_id),
        authRepository.listAuthEmailsByIds(adminClient, [
          studentProfile.user_id,
        ]),
      ])
    );

    if (profileResult.error || !profileResult.data) {
      return null;
    }
    if (emailsResult.error) {
      return null;
    }

    return mapStudentProfileToManagerStudentRow(
      adminClient,
      studentProfile,
      profileResult.data,
      emailsResult.data.get(studentProfile.user_id) ?? ""
    );
  } finally {
    timer.end();
  }
}

/**
 * Logged-in student loading their own profile for the student panel (read-only).
 */
export async function getStudentForSelf(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerStudentRow | null> {
  const userId = await assertStudentSelfAccess(adminClient, actorUserId);

  const { data: studentProfile, error } =
    await studentProfileRepository.findStudentProfileByUserId(
      adminClient,
      userId
    );

  if (error) {
    throw new Error(error.message);
  }

  if (!studentProfile) {
    return null;
  }

  const [profileResult, emailsResult] = await Promise.all([
    profileRepository.findProfileById(adminClient, studentProfile.user_id),
    authRepository.listAuthEmailsByIds(adminClient, [studentProfile.user_id]),
  ]);

  if (profileResult.error || !profileResult.data) {
    return null;
  }
  if (emailsResult.error) {
    return null;
  }

  return mapStudentProfileToManagerStudentRow(
    adminClient,
    studentProfile,
    profileResult.data,
    emailsResult.data.get(studentProfile.user_id) ?? ""
  );
}

export async function getStudentDetailStatsForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  userId: string
): Promise<ManagerStudentDetailStats> {
  const timer = createNavStepTimer("getStudentDetailStats");
  try {
    await timer.step("auth", () =>
      assertPermission(adminClient, actorUserId, PERMISSIONS.STUDENTS_VIEW)
    );

    const [
      classesRegisteredResult,
      classesDoneResult,
      tasksTotalResult,
      tasksDoneResult,
    ] = await timer.step("counts", () =>
      Promise.all([
        studentClassRepository.countStudentClassesByUserId(adminClient, userId),
        studentClassRepository.countDoneStudentClassesByUserId(
          adminClient,
          userId
        ),
        studentTaskRepository.countStudentTasksByStudentId(adminClient, userId),
        studentTaskRepository.countStudentTasksDoneByStudentId(
          adminClient,
          userId
        ),
      ])
    );

    if (classesRegisteredResult.error) {
      throw new Error(classesRegisteredResult.error.message);
    }
    if (classesDoneResult.error) {
      throw new Error(classesDoneResult.error.message);
    }
    if (tasksTotalResult.error) {
      throw new Error(tasksTotalResult.error.message);
    }
    if (tasksDoneResult.error) {
      throw new Error(tasksDoneResult.error.message);
    }

    const classesRegistered = classesRegisteredResult.count ?? 0;
    const classesDone = classesDoneResult.count ?? 0;

    return {
      classesRegistered,
      classesDone,
      classesPending: Math.max(classesRegistered - classesDone, 0),
      tasksDone: tasksDoneResult.count ?? 0,
      tasksTotal: tasksTotalResult.count ?? 0,
    };
  } finally {
    timer.end();
  }
}

export async function getStudentDetailStatsForSelf(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerStudentDetailStats> {
  const userId = await assertStudentSelfAccess(adminClient, actorUserId);

  const [
    classesRegisteredResult,
    classesDoneResult,
    tasksTotalResult,
    tasksDoneResult,
  ] = await Promise.all([
    studentClassRepository.countStudentClassesByUserId(adminClient, userId),
    studentClassRepository.countDoneStudentClassesByUserId(
      adminClient,
      userId
    ),
    studentTaskRepository.countStudentTasksByStudentId(adminClient, userId),
    studentTaskRepository.countStudentTasksDoneByStudentId(
      adminClient,
      userId
    ),
  ]);

  if (classesRegisteredResult.error) {
    throw new Error(classesRegisteredResult.error.message);
  }
  if (classesDoneResult.error) {
    throw new Error(classesDoneResult.error.message);
  }
  if (tasksTotalResult.error) {
    throw new Error(tasksTotalResult.error.message);
  }
  if (tasksDoneResult.error) {
    throw new Error(tasksDoneResult.error.message);
  }

  const classesRegistered = classesRegisteredResult.count ?? 0;
  const classesDone = classesDoneResult.count ?? 0;

  return {
    classesRegistered,
    classesDone,
    classesPending: Math.max(classesRegistered - classesDone, 0),
    tasksDone: tasksDoneResult.count ?? 0,
    tasksTotal: tasksTotalResult.count ?? 0,
  };
}

function mapClassStatus(status: string | null): ClassStatusValue {
  if (
    status === CLASS_STATUSES.SCHEDULED ||
    status === CLASS_STATUSES.IN_PROGRESS ||
    status === CLASS_STATUSES.DONE ||
    status === CLASS_STATUSES.PAUSED ||
    status === CLASS_STATUSES.STOPPED
  ) {
    return status;
  }

  return CLASS_STATUSES.SCHEDULED;
}

export async function listJoinedClassesForStudentManager(
  adminClient: Supabase,
  actorUserId: string | null,
  userId: string
): Promise<ManagerStudentClassRow[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.STUDENTS_VIEW);

  const enrollmentsResult = await studentClassRepository.listStudentClassesByUserId(
    adminClient,
    userId
  );

  if (enrollmentsResult.error) {
    throw new Error(enrollmentsResult.error.message);
  }

  const enrollments = enrollmentsResult.data ?? [];
  if (enrollments.length === 0) {
    return [];
  }

  const classIds = enrollments.map((row) => row.class_id);
  const classesResult = await classRepository.listClassesWithSubjectByIds(
    adminClient,
    classIds
  );

  if (classesResult.error) {
    throw new Error(classesResult.error.message);
  }

  const classById = new Map(
    (classesResult.data ?? []).map((row) => [row.id, row])
  );

  return enrollments.flatMap((enrollment) => {
    const classRow = classById.get(enrollment.class_id);
    if (!classRow) {
      return [];
    }

    return [
      {
        id: enrollment.id,
        class_id: enrollment.class_id,
        name: classRow.name,
        subject_name: classRow.subjects?.name ?? "—",
        class_status: mapClassStatus(classRow.status),
        image_url: classRow.image_url,
        card_gradient: classRow.card_gradient,
        joined_at: enrollment.joined_at ?? "",
      },
    ];
  });
}

export async function listJoinedClassesForStudentSelf(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerStudentClassRow[]> {
  const userId = await assertStudentSelfAccess(adminClient, actorUserId);

  const enrollmentsResult = await studentClassRepository.listStudentClassesByUserId(
    adminClient,
    userId
  );

  if (enrollmentsResult.error) {
    throw new Error(enrollmentsResult.error.message);
  }

  const enrollments = enrollmentsResult.data ?? [];
  if (enrollments.length === 0) {
    return [];
  }

  const classIds = enrollments.map((row) => row.class_id);
  const classesResult = await classRepository.listClassesWithSubjectByIds(
    adminClient,
    classIds
  );

  if (classesResult.error) {
    throw new Error(classesResult.error.message);
  }

  const classById = new Map(
    (classesResult.data ?? []).map((row) => [row.id, row])
  );

  return enrollments.flatMap((enrollment) => {
    const classRow = classById.get(enrollment.class_id);
    if (!classRow) {
      return [];
    }

    return [
      {
        id: enrollment.id,
        class_id: enrollment.class_id,
        name: classRow.name,
        subject_name: classRow.subjects?.name ?? "—",
        class_status: mapClassStatus(classRow.status),
        image_url: classRow.image_url,
        card_gradient: classRow.card_gradient,
        joined_at: enrollment.joined_at ?? "",
      },
    ];
  });
}

/** Single enrolled class row for student self routes (avoids loading the full joined list). */
export async function getJoinedClassForStudentSelf(
  adminClient: Supabase,
  userId: string,
  classId: string
): Promise<ManagerStudentClassRow | null> {
  if (!isUuid(classId)) {
    return null;
  }

  const enrollmentResult =
    await studentClassRepository.findStudentClassByUserAndClass(
      adminClient,
      userId,
      classId
    );

  if (enrollmentResult.error) {
    throw new Error(enrollmentResult.error.message);
  }

  const enrollment = enrollmentResult.data;
  if (!enrollment) {
    return null;
  }

  const classesResult = await classRepository.listClassesWithSubjectByIds(
    adminClient,
    [classId]
  );

  if (classesResult.error) {
    throw new Error(classesResult.error.message);
  }

  const classRow = (classesResult.data ?? [])[0];
  if (!classRow) {
    return null;
  }

  return {
    id: enrollment.id,
    class_id: enrollment.class_id,
    name: classRow.name,
    subject_name: classRow.subjects?.name ?? "—",
    class_status: mapClassStatus(classRow.status),
    image_url: classRow.image_url,
    card_gradient: classRow.card_gradient,
    joined_at: enrollment.joined_at ?? "",
  };
}

/** Classes the student is not currently a member of (for Assign class). */
export async function listAssignableClassesForStudentManager(
  adminClient: Supabase,
  actorUserId: string | null,
  userId: string
): Promise<ManagerClassOption[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.STUDENTS_VIEW);

  const [membershipResult, classesResult] = await Promise.all([
    studentClassRepository.listStudentClassesByUserId(adminClient, userId),
    classRepository.listClassesWithSubjectForPicker(adminClient),
  ]);

  if (membershipResult.error) {
    throw new Error(membershipResult.error.message);
  }

  if (classesResult.error) {
    throw new Error(classesResult.error.message);
  }

  const memberClassIds = new Set(
    (membershipResult.data ?? []).map((row) => row.class_id)
  );

  return (classesResult.data ?? [])
    .filter((row) => !memberClassIds.has(row.id))
    .map((row) => ({
      class_id: row.id,
      name: row.name,
      subject_name: row.subjects?.name ?? "—",
    }));
}

export async function createStudent(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
    birthDate?: string | null;
    phone?: string | null;
  },
  options?: { skipStudentsCreatePermission?: boolean }
): Promise<CreateStudentResult> {
  if (!options?.skipStudentsCreatePermission) {
    const unauthorized = await getUnauthorizedError(
      adminClient,
      actorUserId,
      PERMISSIONS.STUDENTS_CREATE
    );
    if (unauthorized) {
      return { success: false, error: unauthorized };
    }
  }

  const parsed = createStudentSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { fullName, email, password, birthDate, phone } =
    resolveCreateStudentInput(parsed.data);
  const normalizedEmail = email.trim();
  const normalizedFullName = fullName.trim();
  const normalizedBirthDate = normalizeOptionalString(birthDate);
  const normalizedPhone = normalizeOptionalString(phone);

  const existingEmail = await authRepository.findAuthUserByEmail(
    adminClient,
    normalizedEmail
  );

  if (existingEmail.error) {
    return {
      success: false,
      error: mapCreateStudentError(existingEmail.error.message),
    };
  }

  if (existingEmail.data?.user) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: { email: ["This email is already in use."] },
    };
  }

  const { data: authData, error: authError } =
    await authRepository.createAuthUser(adminClient, {
      email: normalizedEmail,
      password,
      fullName: normalizedFullName,
      role: ROLES.STUDENT,
    });

  if (authError || !authData.user) {
    const message = authError?.message ?? "Failed to create auth user.";
    const normalized = message.toLowerCase();

    if (
      normalized.includes("already registered") ||
      normalized.includes("already exists") ||
      (normalized.includes("email") && normalized.includes("already"))
    ) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: { email: ["This email is already in use."] },
      };
    }

    return {
      success: false,
      error: mapCreateStudentError(message),
    };
  }

  const authUserId = authData.user.id;

  try {
    await ensureStudentRegistration(adminClient, {
      authId: authUserId,
      email: normalizedEmail,
      fullName: normalizedFullName,
      birthDate: normalizedBirthDate,
      phone: normalizedPhone,
      role: ROLES.STUDENT,
    });

    await syncAuthUserRole(adminClient, authUserId, ROLES.STUDENT);

    const { data: studentProfile, error: studentProfileError } =
      await studentProfileRepository.findStudentProfileByUserId(
        adminClient,
        authUserId
      );

    if (studentProfileError || !studentProfile) {
      throw new Error(
        studentProfileError?.message ?? "Failed to load student profile."
      );
    }

    const student = await mapStudentProfileToManagerStudentRow(
      adminClient,
      studentProfile,
      {
        created_at: studentProfile.created_at,
        role: ROLES.STUDENT,
        is_instructor: false,
      },
      normalizedEmail
    );

    if (!student) {
      throw new Error("Failed to load student profile.");
    }

    try {
      await notifyStudentCreated({
        email: normalizedEmail,
        password,
        fullName: normalizedFullName,
      });
    } catch {
      // Email failures must not roll back a successfully created account.
    }

    await recordManagerAuditLog(adminClient, actor, {
      action: "insert",
      severity: "warning",
      table_name: "student_profiles",
      record_id: studentProfile.id,
      new_data: {
        user_id: studentProfile.user_id,
        full_name: studentProfile.full_name,
        birth_date: studentProfile.birth_date,
        phone: studentProfile.phone,
        status: studentProfile.status,
        email: normalizedEmail,
      },
      metadata: { note: "Student account created." },
    });

    return {
      success: true,
      student,
      message: "Student account created.",
    };
  } catch (err) {
    await authRepository.deleteAuthUser(adminClient, authUserId);
    const message = err instanceof Error ? err.message : "Registration failed.";
    return {
      success: false,
      error: message,
    };
  }
}

export async function updateStudent(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    studentProfileId: string;
    userId: string;
    fullName: string;
    email: string;
    birthDate?: string | null;
    phone?: string | null;
    status: string;
  }
): Promise<UpdateStudentResult> {
  const unauthorized = await getUnauthorizedError(adminClient, actorUserId, PERMISSIONS.STUDENTS_UPDATE);
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = updateStudentSchema.safeParse({
    fullName: input.fullName,
    email: input.email,
    birthDate: input.birthDate,
    phone: input.phone,
    status: input.status,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { studentProfileId, userId } = input;
  const {
    fullName,
    email,
    birthDate,
    phone,
    status,
  } = parsed.data;

  const normalizedEmail = email.trim();
  const normalizedFullName = fullName.trim();
  const normalizedBirthDate = normalizeOptionalString(birthDate);
  const normalizedPhone = normalizeOptionalString(phone);

  const [existingStudentProfile, existingProfile, authUserResult] =
    await Promise.all([
      studentProfileRepository.findStudentProfileById(
        adminClient,
        studentProfileId
      ),
      profileRepository.findProfileById(adminClient, userId),
      authRepository.getAuthUserById(adminClient, userId),
    ]);

  if (existingStudentProfile.error) {
    return {
      success: false,
      error: existingStudentProfile.error.message,
    };
  }

  if (
    !existingStudentProfile.data ||
    existingStudentProfile.data.user_id !== userId
  ) {
    return { success: false, error: "Student not found." };
  }

  if (existingProfile.error || !existingProfile.data) {
    return { success: false, error: "Student not found." };
  }

  if (existingProfile.data.role !== ROLES.STUDENT) {
    return { success: false, error: "Student not found." };
  }

  const oldEmail = authUserResult.data?.user?.email ?? null;
  const emailChanged = normalizedEmail !== (oldEmail ?? "").trim();

  const existingEmail = emailChanged
    ? await authRepository.findAuthUserByEmail(adminClient, normalizedEmail)
    : { data: null, error: null };

  if (existingEmail.error) {
    return {
      success: false,
      error: mapUpdateStudentError(existingEmail.error.message),
    };
  }

  if (existingEmail.data?.user && existingEmail.data.user.id !== userId) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: { email: ["This email is already in use."] },
    };
  }

  const { error: profileError } = await profileRepository.updateProfileById(
    adminClient,
    userId,
    { full_name: normalizedFullName }
  );

  if (profileError) {
    return {
      success: false,
      error: mapUpdateStudentError(profileError.message),
    };
  }

  const { error: authError } = await authRepository.updateAuthUserByAdmin(
    adminClient,
    userId,
    {
      email: normalizedEmail,
      fullName: normalizedFullName,
    }
  );

  if (authError) {
    return {
      success: false,
      error: mapUpdateStudentError(authError.message),
    };
  }

  const { data: updatedStudentProfile, error: studentProfileError } =
    await studentProfileRepository.updateStudentProfileById(
      adminClient,
      studentProfileId,
      {
        full_name: normalizedFullName,
        birth_date: normalizedBirthDate,
        phone: normalizedPhone,
        status,
      }
    );

  if (studentProfileError || !updatedStudentProfile) {
    return {
      success: false,
      error: mapUpdateStudentError(
        studentProfileError?.message ?? "Failed to update student profile."
      ),
    };
  }

  const student = await mapStudentProfileToManagerStudentRow(
    adminClient,
    updatedStudentProfile,
    {
      created_at: existingProfile.data.created_at,
      role: existingProfile.data.role,
      is_instructor: existingProfile.data.is_instructor,
    },
    normalizedEmail
  );

  if (!student) {
    return {
      success: false,
      error: "Failed to load updated student.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "warning",
    table_name: "student_profiles",
    record_id: studentProfileId,
    old_data: {
      full_name: existingStudentProfile.data.full_name,
      birth_date: existingStudentProfile.data.birth_date,
      phone: existingStudentProfile.data.phone,
      status: existingStudentProfile.data.status,
      email: oldEmail,
    },
    new_data: {
      full_name: updatedStudentProfile.full_name,
      birth_date: updatedStudentProfile.birth_date,
      phone: updatedStudentProfile.phone,
      status: updatedStudentProfile.status,
      email: normalizedEmail,
    },
    metadata: {
      note: "Student details updated.",
      changed_fields: [
        "full_name",
        "birth_date",
        "phone",
        "status",
        "email",
      ],
      user_id: userId,
    },
  });

  return {
    success: true,
    student,
    message: "Student details updated.",
  };
}
