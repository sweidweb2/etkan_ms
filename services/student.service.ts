import { unstable_cache } from "next/cache";
import { CLASS_STATUSES, type ClassStatusValue } from "@/lib/constants/manager-class-status";
import { STUDENT_STATUSES } from "@/lib/constants/manager-student-status";
import type { StudentStatusValue } from "@/lib/constants/manager-student-status";
import { ROLES, type RoleValue } from "@/lib/constants/roles";
import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  assertPermission,
  getUnauthorizedError,
} from "@/services/authorization.service";
import { MANAGER_CACHE_TAGS } from "@/lib/cache/manager-list-cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createStudentSchema } from "@/lib/validators/manager/create-student";
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
} from "@/services/audit-log.service";
import { ensureStudentRegistration } from "@/services/profile.service";
import { syncAuthUserRole } from "@/services/role.service";
import type { FieldErrors } from "@/types/auth";
import type {
  ManagerStudentDetailStats,
  ManagerStudentRow,
  ManagerStudentWithoutActiveClassRow,
} from "@/types/manager-student";
import type { ManagerStudentClassRow } from "@/types/manager-student-class";
import type { ManagerClassOption } from "@/types/manager-class";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

type StudentWelcomeEmailPayload = {
  email: string;
  username: string;
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
  }
): Promise<ManagerStudentRow | null> {
  const [profileResult, authResult] = await Promise.all([
    profileRepository.findProfileById(adminClient, studentProfile.user_id),
    authRepository.getAuthUserById(adminClient, studentProfile.user_id),
  ]);

  if (profileResult.error || !profileResult.data) {
    return null;
  }

  if (authResult.error || !authResult.data.user) {
    return null;
  }

  return {
    user_id: studentProfile.user_id,
    student_profile_id: studentProfile.id,
    username: profileResult.data.username,
    email: authResult.data.user.email ?? "",
    full_name: studentProfile.full_name,
    birth_date: studentProfile.birth_date,
    phone: studentProfile.phone,
    status: mapStudentStatus(studentProfile.status),
    created_at:
      studentProfile.created_at ??
      profileResult.data.created_at ??
      authResult.data.user.created_at,
  };
}

async function fetchStudentsForManager(
  adminClient: Supabase
): Promise<ManagerStudentRow[]> {
  const { data: studentProfiles, error } =
    await studentProfileRepository.listStudentProfiles(adminClient);

  if (error) {
    throw new Error(error.message);
  }

  if (!studentProfiles?.length) {
    return [];
  }

  const students = await Promise.all(
    studentProfiles.map((studentProfile) =>
      mapStudentProfileToManagerStudentRow(adminClient, studentProfile)
    )
  );

  return students.filter(
    (student): student is ManagerStudentRow => student !== null
  );
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
  await assertPermission(adminClient, actorUserId, PERMISSIONS.STUDENTS_VIEW);

  const { data: studentProfile, error } =
    await studentProfileRepository.findStudentProfileById(
      adminClient,
      studentProfileId
    );

  if (error) {
    throw new Error(error.message);
  }

  if (!studentProfile) {
    return null;
  }

  return mapStudentProfileToManagerStudentRow(adminClient, studentProfile);
}

export async function getStudentDetailStatsForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  userId: string
): Promise<ManagerStudentDetailStats> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.STUDENTS_VIEW);

  const [
    classesRegisteredResult,
    enrollmentsResult,
    tasksTotalResult,
    tasksDoneResult,
  ] = await Promise.all([
    studentClassRepository.countStudentClassesByUserId(adminClient, userId),
    studentClassRepository.listStudentClassesByUserId(adminClient, userId),
    studentTaskRepository.countStudentTasksByStudentId(adminClient, userId),
    studentTaskRepository.countStudentTasksDoneByStudentId(adminClient, userId),
  ]);

  if (classesRegisteredResult.error) {
    throw new Error(classesRegisteredResult.error.message);
  }

  if (enrollmentsResult.error) {
    throw new Error(enrollmentsResult.error.message);
  }

  if (tasksTotalResult.error) {
    throw new Error(tasksTotalResult.error.message);
  }

  if (tasksDoneResult.error) {
    throw new Error(tasksDoneResult.error.message);
  }

  const classesRegistered = classesRegisteredResult.count ?? 0;
  const enrollmentClassIds = (enrollmentsResult.data ?? []).map(
    (row) => row.class_id
  );

  let classesDone = 0;
  if (enrollmentClassIds.length > 0) {
    const classesResult = await classRepository.listClassesWithSubjectByIds(
      adminClient,
      enrollmentClassIds
    );
    if (classesResult.error) {
      throw new Error(classesResult.error.message);
    }
    classesDone = (classesResult.data ?? []).filter(
      (row) => row.status === CLASS_STATUSES.DONE
    ).length;
  }

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
        joined_at: enrollment.joined_at ?? "",
      },
    ];
  });
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
    username: string;
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
    birthDate?: string | null;
    phone?: string | null;
  }
): Promise<CreateStudentResult> {
  const unauthorized = await getUnauthorizedError(adminClient, actorUserId, PERMISSIONS.STUDENTS_CREATE);
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = createStudentSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { username, fullName, email, password, birthDate, phone } = parsed.data;
  const normalizedUsername = username.trim();
  const normalizedEmail = email.trim();
  const normalizedFullName = fullName.trim();
  const normalizedBirthDate = normalizeOptionalString(birthDate);
  const normalizedPhone = normalizeOptionalString(phone);

  const existingUsername = await profileRepository.findProfileByUsername(
    adminClient,
    normalizedUsername
  );

  if (existingUsername.data) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: { username: ["This username is already taken."] },
    };
  }

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
      username: normalizedUsername,
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
      username: normalizedUsername,
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
      studentProfile
    );

    if (!student) {
      throw new Error("Failed to load student profile.");
    }

    try {
      await notifyStudentCreated({
        email: normalizedEmail,
        username: normalizedUsername,
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
        username: normalizedUsername,
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
    username: string;
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
    username: input.username,
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
    username,
    fullName,
    email,
    birthDate,
    phone,
    status,
  } = parsed.data;

  const normalizedUsername = username.trim();
  const normalizedEmail = email.trim();
  const normalizedFullName = fullName.trim();
  const normalizedBirthDate = normalizeOptionalString(birthDate);
  const normalizedPhone = normalizeOptionalString(phone);

  const existingStudentProfile =
    await studentProfileRepository.findStudentProfileById(
      adminClient,
      studentProfileId
    );

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

  const existingProfile = await profileRepository.findProfileById(
    adminClient,
    userId
  );

  if (existingProfile.error || !existingProfile.data) {
    return { success: false, error: "Student not found." };
  }

  if (existingProfile.data.role !== ROLES.STUDENT) {
    return { success: false, error: "Student not found." };
  }

  const existingUsername = await profileRepository.findProfileByUsername(
    adminClient,
    normalizedUsername
  );

  if (
    existingUsername.data &&
    existingUsername.data.id !== userId
  ) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: { username: ["This username is already taken."] },
    };
  }

  const existingEmail = await authRepository.findAuthUserByEmail(
    adminClient,
    normalizedEmail
  );

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

  const authUserResult = await authRepository.getAuthUserById(
    adminClient,
    userId
  );
  const oldEmail = authUserResult.data?.user?.email ?? null;

  const { error: profileError } = await profileRepository.updateProfileById(
    adminClient,
    userId,
    { username: normalizedUsername }
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
      username: normalizedUsername,
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
    updatedStudentProfile
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
      username: existingProfile.data.username,
      email: oldEmail,
    },
    new_data: {
      full_name: updatedStudentProfile.full_name,
      birth_date: updatedStudentProfile.birth_date,
      phone: updatedStudentProfile.phone,
      status: updatedStudentProfile.status,
      username: normalizedUsername,
      email: normalizedEmail,
    },
    metadata: {
      note: "Student details updated.",
      changed_fields: [
        "full_name",
        "birth_date",
        "phone",
        "status",
        "username",
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
