import "server-only";

import { unstable_cache } from "next/cache";
import { markClaimsRoleOverride } from "@/lib/auth/claims-role-override-cache";
import { clearCachedSessionShell } from "@/lib/auth/session-shell-cache";
import {
  STUDENT_STATUSES,
  type StudentStatusValue,
} from "@/lib/constants/manager-student-status";
import { MANAGER_CREATABLE_ROLES } from "@/lib/constants/manager-user-roles";
import { ROLES, type RoleValue } from "@/lib/constants/roles";
import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  assertPermission,
  getUnauthorizedError,
} from "@/services/auth/authorization.service";
import { MANAGER_CACHE_TAGS } from "@/lib/cache/manager-list-cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  createStaffUserSchema,
  resolveCreateStaffUserInput,
} from "@/lib/validators/manager/create-user";
import { updateManagerUserSchema } from "@/lib/validators/manager/update-user";
import * as authRepository from "@/repositories/auth.repository";
import { clearInstructorWorkshopRelatedData } from "@/lib/manager/instructors/clear-instructor-related";
import * as profileRepository from "@/repositories/profile.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import { syncAuthUserRole } from "@/services/auth/role.service";
import type { FieldErrors } from "@/types/auth";
import type {
  ManagerEmailingRecipientsListData,
  ManagerEmailingRecipientsListQuery,
  ManagerEmailingRecipientsListStats,
} from "@/types/manager-emailing";
import type {
  ManagerUserRow,
  ManagerUsersListData,
  ManagerUsersListQuery,
  ManagerUsersListStats,
} from "@/types/manager-user";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

type StaffWelcomeEmailPayload = {
  email: string;
  fullName: string;
  password: string;
  role: RoleValue;
};

export type CreateStaffUserSuccess = {
  success: true;
  user: ManagerUserRow;
  message: string;
};

export type CreateStaffUserFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type CreateStaffUserResult = CreateStaffUserSuccess | CreateStaffUserFailure;

export type UpdateManagerUserSuccess = {
  success: true;
  user: ManagerUserRow;
  message: string;
};

export type UpdateManagerUserFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type UpdateManagerUserResult =
  | UpdateManagerUserSuccess
  | UpdateManagerUserFailure;

function normalizeOptionalString(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function mapStudentStatus(status: string | null | undefined): StudentStatusValue {
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

function mapUpdateManagerUserError(message: string): string {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("already registered") ||
    normalized.includes("already exists") ||
    (normalized.includes("email") && normalized.includes("already"))
  ) {
    return "An account with this email already exists.";
  }

  return "Unable to update user. Please try again.";
}

function mapCreateStaffUserError(message: string): string {
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

  return "Unable to create user. Please try again.";
}

/** Phase 2: send welcome email with account credentials. */
async function notifyStaffUserCreated(
  payload: StaffWelcomeEmailPayload
): Promise<void> {
  void payload;
  // Intentionally no-op until email infrastructure is added.
}

async function fetchUsersForManager(
  adminClient: Supabase
): Promise<ManagerUserRow[]> {
  const { data: profiles, error } = await profileRepository.listProfiles(
    adminClient
  );

  if (error) {
    throw new Error(error.message);
  }

  if (!profiles?.length) {
    return [];
  }

  const allUserIds = profiles.map((profile) => profile.id);
  const [emailsResult, studentProfilesResult] = await Promise.all([
    authRepository.listAuthEmailsByIds(adminClient, allUserIds),
    studentProfileRepository.listStudentProfileDetailsByUserIds(
      adminClient,
      allUserIds
    ),
  ]);

  if (emailsResult.error) {
    throw new Error(emailsResult.error.message);
  }
  if (studentProfilesResult.error) {
    throw new Error(studentProfilesResult.error.message);
  }

  const emailById = emailsResult.data;
  const studentProfileByUserId = new Map(
    (studentProfilesResult.data ?? []).map((row) => [row.user_id, row])
  );

  return profiles.map((profile) => {
    const user: ManagerUserRow = {
      id: profile.id,
      full_name: profile.full_name,
      role: profile.role as RoleValue,
      is_instructor: profile.is_instructor,
      created_at: profile.created_at ?? "",
      email: emailById.get(profile.id) ?? "",
    };

    const studentProfile = studentProfileByUserId.get(profile.id);

    if (!studentProfile) {
      return user.role === ROLES.STUDENT
        ? { ...user, student_profile_id: null }
        : user;
    }

    return {
      ...user,
      student_profile_id: studentProfile.id,
      student_full_name: studentProfile.full_name,
      student_birth_date: studentProfile.birth_date,
      student_phone: studentProfile.phone,
      student_status: studentProfile.status as ManagerUserRow["student_status"],
    };
  });
}

const listUsersForManagerCached = unstable_cache(
  async () => {
    const adminClient = createSupabaseAdminClient();
    return fetchUsersForManager(adminClient);
  },
  ["manager-users-list"],
  { tags: [MANAGER_CACHE_TAGS.USERS], revalidate: 3600 }
);

/**
 * Lists all users for the manager panel.
 * Auth is checked outside the cache; the list body is shared-server-cached.
 * The `adminClient` argument is kept for call-site compatibility; the cached
 * path creates its own admin client inside `unstable_cache`.
 *
 * Prefer `listUsersPageForManager` for the users table UI and
 * `listEmailingRecipientsPageForManager` for emailing recipient pickers.
 */
export async function listUsersForManager(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerUserRow[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.USERS_VIEW);
  return listUsersForManagerCached();
}

const USERS_PAGE_SIZE_OPTIONS = [5, 10, 25] as const;
const USERS_PAGE_SIZE_DEFAULT = 10;

const STAFF_ROLES_FOR_STATS = [
  ROLES.MANAGER,
  ROLES.CO_MANAGER,
  ROLES.ADMIN,
  ROLES.CEO,
  ROLES.SUPERVISOR,
  ROLES.CRM,
] as const;

function clampUsersPageSize(pageSize: number | undefined): number {
  if (
    pageSize !== undefined &&
    (USERS_PAGE_SIZE_OPTIONS as readonly number[]).includes(pageSize)
  ) {
    return pageSize;
  }
  return USERS_PAGE_SIZE_DEFAULT;
}

async function fetchUsersListStats(
  adminClient: Supabase
): Promise<ManagerUsersListStats> {
  const [totalResult, teachersResult, staffResult] = await Promise.all([
    profileRepository.countProfiles(adminClient, {
      excludeRoles: [ROLES.STUDENT],
    }),
    profileRepository.countProfiles(adminClient, {
      roles: [ROLES.TEACHER],
    }),
    profileRepository.countProfiles(adminClient, {
      roles: [...STAFF_ROLES_FOR_STATS],
    }),
  ]);

  const error =
    totalResult.error ?? teachersResult.error ?? staffResult.error ?? null;
  if (error) {
    throw new Error(error.message);
  }

  return {
    total: totalResult.count ?? 0,
    teachers: teachersResult.count ?? 0,
    staff: staffResult.count ?? 0,
  };
}

/**
 * Server-paged staff users list for the manager panel (excludes students).
 * Search matches profiles.full_name (and id for a pasted UUID).
 * Email is not searchable here: auth emails live outside Postgres tables.
 */
export async function listUsersPageForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  query: ManagerUsersListQuery = {}
): Promise<ManagerUsersListData> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.USERS_VIEW);

  const pageSize = clampUsersPageSize(query.pageSize);
  const requestedPage = Math.max(1, Math.floor(query.page ?? 1));
  const search = query.search?.trim() ?? "";
  const roleFilter =
    query.role && query.role !== ROLES.STUDENT ? query.role : null;

  const fetchPage = (page: number) =>
    profileRepository.listProfilesPage(adminClient, {
      offset: (page - 1) * pageSize,
      limit: pageSize,
      roles: roleFilter ? [roleFilter] : undefined,
      excludeRoles: roleFilter ? undefined : [ROLES.STUDENT],
      search,
    });

  const [initialPageResult, stats] = await Promise.all([
    fetchPage(requestedPage),
    fetchUsersListStats(adminClient),
  ]);

  let pageResult = initialPageResult;
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

  const profiles = pageResult.data ?? [];
  if (profiles.length === 0) {
    return { users: [], totalCount, page, pageSize, stats };
  }

  const pageIds = profiles.map((profile) => profile.id);
  const emailsResult = await authRepository.listAuthEmailsByIds(
    adminClient,
    pageIds
  );

  if (emailsResult.error) {
    throw new Error(emailsResult.error.message);
  }

  const emailById = emailsResult.data;
  const users: ManagerUserRow[] = profiles.map((profile) => ({
    id: profile.id,
    full_name: profile.full_name,
    role: profile.role as RoleValue,
    is_instructor: profile.is_instructor,
    created_at: profile.created_at ?? "",
    email: emailById.get(profile.id) ?? "",
  }));

  return { users, totalCount, page, pageSize, stats };
}

const EMAILING_RECIPIENTS_PAGE_SIZE_OPTIONS = [5, 10, 25] as const;
const EMAILING_RECIPIENTS_PAGE_SIZE_DEFAULT = 10;
/** PostgREST `.in()` URL safety for class-member id filters. */
const EMAILING_RECIPIENTS_IDS_IN_LIMIT = 150;
const EMAILING_RECIPIENT_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function clampEmailingRecipientsPageSize(pageSize: number | undefined): number {
  if (
    pageSize !== undefined &&
    (EMAILING_RECIPIENTS_PAGE_SIZE_OPTIONS as readonly number[]).includes(
      pageSize
    )
  ) {
    return pageSize;
  }
  return EMAILING_RECIPIENTS_PAGE_SIZE_DEFAULT;
}

async function fetchEmailingRecipientsListStats(
  adminClient: Supabase
): Promise<ManagerEmailingRecipientsListStats> {
  const [totalResult, studentsResult] = await Promise.all([
    profileRepository.countProfiles(adminClient),
    profileRepository.countProfiles(adminClient, {
      roles: [ROLES.STUDENT],
    }),
  ]);

  const error = totalResult.error ?? studentsResult.error ?? null;
  if (error) {
    throw new Error(error.message);
  }

  return {
    total: totalResult.count ?? 0,
    students: studentsResult.count ?? 0,
  };
}

async function hydrateEmailingRecipientRows(
  adminClient: Supabase,
  profiles: Array<{
    id: string;
    full_name: string;
    role: string;
    is_instructor: boolean;
    created_at: string | null;
  }>
): Promise<ManagerUserRow[]> {
  if (profiles.length === 0) {
    return [];
  }

  const pageIds = profiles.map((profile) => profile.id);
  const emailsResult = await authRepository.listAuthEmailsByIds(
    adminClient,
    pageIds
  );

  if (emailsResult.error) {
    throw new Error(emailsResult.error.message);
  }

  const emailById = emailsResult.data;
  return profiles.map((profile) => ({
    id: profile.id,
    full_name: profile.full_name,
    role: profile.role as RoleValue,
    is_instructor: profile.is_instructor,
    created_at: profile.created_at ?? "",
    email: emailById.get(profile.id) ?? "",
  }));
}

/**
 * Server-paged emailing recipients (all roles, including students).
 * Search matches profiles.full_name (and id for a pasted UUID).
 * Email is not searchable here: auth emails live outside Postgres tables.
 * Optional `userIds` restricts to a set (e.g. class members).
 */
export async function listEmailingRecipientsPageForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  query: ManagerEmailingRecipientsListQuery = {}
): Promise<ManagerEmailingRecipientsListData> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.EMAILING_VIEW);

  const pageSize = clampEmailingRecipientsPageSize(query.pageSize);
  const requestedPage = Math.max(1, Math.floor(query.page ?? 1));
  const search = query.search?.trim() ?? "";
  const roleFilter = query.role ?? null;
  const userIds = query.userIds ? [...new Set(query.userIds.filter(Boolean))] : null;

  if (userIds && userIds.length === 0) {
    const stats = await fetchEmailingRecipientsListStats(adminClient);
    return {
      users: [],
      totalCount: 0,
      page: 1,
      pageSize,
      stats,
    };
  }

  const roles = roleFilter ? [roleFilter] : undefined;

  const fetchPage = (page: number) => {
    if (userIds && userIds.length > EMAILING_RECIPIENTS_IDS_IN_LIMIT) {
      return null;
    }

    return profileRepository.listProfilesPage(adminClient, {
      offset: (page - 1) * pageSize,
      limit: pageSize,
      roles,
      search,
      ids: userIds ?? undefined,
    });
  };

  // Large class / id sets: load matching profiles via chunked `.in()`, then page in memory.
  if (userIds && userIds.length > EMAILING_RECIPIENTS_IDS_IN_LIMIT) {
    const [profilesResult, stats] = await Promise.all([
      profileRepository.listProfilesByIds(adminClient, userIds),
      fetchEmailingRecipientsListStats(adminClient),
    ]);

    if (profilesResult.error) {
      throw new Error(profilesResult.error.message);
    }

    const normalizedSearch = search.toLowerCase();
    let profiles = profilesResult.data ?? [];
    if (roleFilter) {
      profiles = profiles.filter((profile) => profile.role === roleFilter);
    }
    if (normalizedSearch) {
      profiles = profiles.filter((profile) => {
        if (profile.full_name.toLowerCase().includes(normalizedSearch)) {
          return true;
        }
        return EMAILING_RECIPIENT_UUID_PATTERN.test(normalizedSearch)
          ? profile.id.toLowerCase() === normalizedSearch
          : false;
      });
    }

    profiles = [...profiles].sort((a, b) => {
      const createdDiff = (b.created_at ?? "").localeCompare(a.created_at ?? "");
      if (createdDiff !== 0) {
        return createdDiff;
      }
      return b.id.localeCompare(a.id);
    });

    const totalCount = profiles.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const page = Math.min(requestedPage, totalPages);
    const pageProfiles = profiles.slice((page - 1) * pageSize, page * pageSize);
    const users = await hydrateEmailingRecipientRows(adminClient, pageProfiles);

    return { users, totalCount, page, pageSize, stats };
  }

  const [initialPageResult, stats] = await Promise.all([
    fetchPage(requestedPage)!,
    fetchEmailingRecipientsListStats(adminClient),
  ]);

  let pageResult = initialPageResult;
  let page = requestedPage;

  if (pageResult.error) {
    throw new Error(pageResult.error.message);
  }

  const totalCount = pageResult.count ?? 0;

  if (totalCount > 0 && (pageResult.data ?? []).length === 0) {
    page = Math.max(1, Math.ceil(totalCount / pageSize));
    pageResult = await fetchPage(page)!;
    if (pageResult.error) {
      throw new Error(pageResult.error.message);
    }
  }

  const users = await hydrateEmailingRecipientRows(
    adminClient,
    pageResult.data ?? []
  );

  return { users, totalCount, page, pageSize, stats };
}

/**
 * On-demand bulk roster for compose/resend role shortcuts.
 * Loads matching profiles (optionally by role) and hydrates emails.
 * Prefer `listEmailingRecipientsPageForManager` for table/search UIs.
 */
export async function listEmailingRecipientsForBulkForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  roles?: RoleValue[] | null
): Promise<ManagerUserRow[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.EMAILING_VIEW);

  const { data: profiles, error } = await profileRepository.listProfiles(
    adminClient,
    roles?.length ? { roles } : undefined
  );

  if (error) {
    throw new Error(error.message);
  }

  return hydrateEmailingRecipientRows(adminClient, profiles ?? []);
}

/**
 * Resolve a single emailing recipient by email (compose external → user match).
 */
export async function findEmailingRecipientByEmailForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  email: string
): Promise<ManagerUserRow | null> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.EMAILING_VIEW);

  const { data: authUser, error } = await authRepository.findAuthUserByEmail(
    adminClient,
    email
  );

  if (error) {
    throw new Error(error.message);
  }
  if (!authUser?.user) {
    return null;
  }

  const userId = authUser.user.id;
  const { data: profile, error: profileError } =
    await profileRepository.findProfileById(adminClient, userId);

  if (profileError) {
    throw new Error(profileError.message);
  }
  if (!profile) {
    return null;
  }

  const [row] = await hydrateEmailingRecipientRows(adminClient, [profile]);
  return row ?? null;
}

/**
 * Single user for manager detail — targeted fetch (not the full roster).
 */
export async function getUserForManagerById(
  adminClient: Supabase,
  actorUserId: string | null,
  userId: string
): Promise<ManagerUserRow | null> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.USERS_VIEW);

  const { data: profile, error } = await profileRepository.findProfileById(
    adminClient,
    userId
  );

  if (error) {
    throw new Error(error.message);
  }
  if (!profile) {
    return null;
  }

  const [emailsResult, studentProfilesResult] = await Promise.all([
    authRepository.listAuthEmailsByIds(adminClient, [userId]),
    studentProfileRepository.listStudentProfileDetailsByUserIds(adminClient, [
      userId,
    ]),
  ]);

  if (emailsResult.error) {
    throw new Error(emailsResult.error.message);
  }
  if (studentProfilesResult.error) {
    throw new Error(studentProfilesResult.error.message);
  }

  const studentProfile = (studentProfilesResult.data ?? [])[0];
  const user: ManagerUserRow = {
    id: profile.id,
    full_name: profile.full_name,
    role: profile.role as RoleValue,
    is_instructor: profile.is_instructor,
    created_at: profile.created_at ?? "",
    email: emailsResult.data.get(userId) ?? "",
  };

  if (!studentProfile) {
    return user.role === ROLES.STUDENT
      ? { ...user, student_profile_id: null }
      : user;
  }

  return {
    ...user,
    student_profile_id: studentProfile.id,
    student_full_name: studentProfile.full_name,
    student_birth_date: studentProfile.birth_date,
    student_phone: studentProfile.phone,
    student_status: mapStudentStatus(studentProfile.status),
  };
}

export async function createStaffUser(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    fullName: string;
    email: string;
    password: string;
    role: string;
    is_instructor: boolean;
  }
): Promise<CreateStaffUserResult> {
  const unauthorized = await getUnauthorizedError(adminClient, actorUserId, PERMISSIONS.USERS_CREATE);
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = createStaffUserSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { fullName, email, password, role, is_instructor } =
    resolveCreateStaffUserInput(parsed.data);

  if (!MANAGER_CREATABLE_ROLES.includes(role)) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: { role: ["Please select a valid staff role."] },
    };
  }

  const normalizedFullName = fullName.trim();
  const normalizedEmail = email.trim();

  const existingEmail = await authRepository.findAuthUserByEmail(
    adminClient,
    normalizedEmail
  );

  if (existingEmail.error) {
    return {
      success: false,
      error: mapCreateStaffUserError(existingEmail.error.message),
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
      role,
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
      error: mapCreateStaffUserError(message),
    };
  }

  const authUserId = authData.user.id;

  try {
    const { error: profileError } = await profileRepository.createProfile(
      adminClient,
      {
        id: authUserId,
        full_name: normalizedFullName,
        role,
        is_instructor,
      }
    );

    if (profileError) {
      throw new Error(profileError.message);
    }

    await syncAuthUserRole(adminClient, authUserId, role);

    const user: ManagerUserRow = {
      id: authUserId,
      full_name: normalizedFullName,
      role,
      is_instructor,
      created_at: authData.user.created_at,
      email: normalizedEmail,
    };

    try {
      await notifyStaffUserCreated({
        email: normalizedEmail,
        fullName: normalizedFullName,
        password,
        role,
      });
    } catch {
      // Email failures must not roll back a successfully created account.
    }

    await recordManagerAuditLog(adminClient, actor, {
      action: "insert",
      severity: "warning",
      table_name: "profiles",
      record_id: authUserId,
      new_data: {
        full_name: normalizedFullName,
        role,
        email: normalizedEmail,
        is_instructor,
      },
      metadata: { note: "Staff account created." },
    });

    return {
      success: true,
      user,
      message: "Staff account created.",
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

export async function updateManagerUser(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    userId: string;
    fullName: string;
    email: string;
    role: string;
    is_instructor: boolean;
    birthDate?: string | null;
    phone?: string | null;
    status?: string;
    password?: string;
    confirmPassword?: string;
  }
): Promise<UpdateManagerUserResult> {
  const unauthorized = await getUnauthorizedError(adminClient, actorUserId, PERMISSIONS.USERS_UPDATE);
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = updateManagerUserSchema.safeParse({
    fullName: input.fullName,
    email: input.email,
    role: input.role,
    is_instructor: input.is_instructor,
    birthDate: input.birthDate ?? "",
    phone: input.phone ?? "",
    status: input.status,
    password: input.password ?? "",
    confirmPassword: input.confirmPassword ?? "",
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { userId } = input;
  const { fullName, email, role, is_instructor } = parsed.data;
  const normalizedFullName = fullName.trim();
  const normalizedEmail = email.trim();
  const normalizedBirthDate = normalizeOptionalString(parsed.data.birthDate);
  const normalizedPhone = normalizeOptionalString(parsed.data.phone);
  const studentStatus = mapStudentStatus(parsed.data.status);

  const existingProfile = await profileRepository.findProfileById(
    adminClient,
    userId
  );

  if (existingProfile.error || !existingProfile.data) {
    return { success: false, error: "User not found." };
  }

  const preUpdateLookups = await Promise.all([
    authRepository.findAuthUserByEmail(adminClient, normalizedEmail),
    authRepository.getAuthUserById(adminClient, userId),
    ...(role === ROLES.STUDENT
      ? [
          studentProfileRepository.findStudentProfileByUserId(
            adminClient,
            userId
          ),
        ]
      : []),
  ]);

  const existingEmail = preUpdateLookups[0];
  const authUserResult = preUpdateLookups[1];
  const existingStudentResult =
    role === ROLES.STUDENT
      ? (preUpdateLookups[2] as Awaited<
          ReturnType<typeof studentProfileRepository.findStudentProfileByUserId>
        >)
      : null;

  if (existingEmail.error) {
    return {
      success: false,
      error: mapUpdateManagerUserError(existingEmail.error.message),
    };
  }

  if (existingEmail.data?.user && existingEmail.data.user.id !== userId) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: { email: ["This email is already in use."] },
    };
  }

  if (authUserResult.error || !authUserResult.data?.user) {
    return { success: false, error: "User not found." };
  }

  const previousRole = existingProfile.data.role as RoleValue;
  const previousIsInstructor = existingProfile.data.is_instructor;
  const previousEmail = authUserResult.data.user.email ?? null;

  const { data: updatedProfile, error: profileError } =
    await profileRepository.updateProfileById(adminClient, userId, {
      full_name: normalizedFullName,
      role,
      is_instructor,
    });

  if (profileError || !updatedProfile) {
    return {
      success: false,
      error: mapUpdateManagerUserError(
        profileError?.message ?? "Failed to update profile."
      ),
    };
  }

  if (previousIsInstructor && !is_instructor) {
    const relatedClear = await clearInstructorWorkshopRelatedData(
      adminClient,
      userId
    );
    if (relatedClear.error) {
      return {
        success: false,
        error: mapUpdateManagerUserError(relatedClear.error),
      };
    }
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
      error: mapUpdateManagerUserError(authError.message),
    };
  }

  const nextPassword = (parsed.data.password ?? "").trim();
  if (nextPassword) {
    const { error: passwordError } =
      await authRepository.updateAuthUserPasswordByAdmin(
        adminClient,
        userId,
        nextPassword
      );

    if (passwordError) {
      return {
        success: false,
        error: mapUpdateManagerUserError(passwordError.message),
      };
    }
  }

  if (previousRole !== role) {
    try {
      await syncAuthUserRole(adminClient, userId, role);
      // JWT may still carry previousRole until refresh — force panel gates now.
      markClaimsRoleOverride(userId, role);
    } catch (err) {
      return {
        success: false,
        error: mapUpdateManagerUserError(
          err instanceof Error ? err.message : "Failed to sync role."
        ),
      };
    }
  }

  let studentProfileId: string | null = null;
  let studentFullName: string | null = null;
  let studentBirthDate: string | null = null;
  let studentPhone: string | null = null;
  let studentStatusValue: StudentStatusValue | null = null;

  if (role === ROLES.STUDENT) {
    if (existingStudentResult?.error) {
      return {
        success: false,
        error: mapUpdateManagerUserError(existingStudentResult.error.message),
      };
    }

    if (existingStudentResult?.data) {
      // Existing student_profiles row: override with the submitted form data.
      const { data: updatedStudent, error: studentProfileError } =
        await studentProfileRepository.updateStudentProfileById(
          adminClient,
          existingStudentResult.data.id,
          {
            full_name: normalizedFullName,
            birth_date: normalizedBirthDate,
            phone: normalizedPhone,
            status: studentStatus,
          }
        );

      if (studentProfileError || !updatedStudent) {
        return {
          success: false,
          error: mapUpdateManagerUserError(
            studentProfileError?.message ?? "Failed to update student profile."
          ),
        };
      }

      studentProfileId = updatedStudent.id;
      studentFullName = updatedStudent.full_name;
      studentBirthDate = updatedStudent.birth_date;
      studentPhone = updatedStudent.phone;
      studentStatusValue = mapStudentStatus(updatedStudent.status);
    } else {
      // No student_profiles row yet: create one from the submitted form data.
      const { data: createdStudent, error: createStudentError } =
        await studentProfileRepository.createStudentProfile(adminClient, {
          user_id: userId,
          full_name: normalizedFullName,
          birth_date: normalizedBirthDate,
          phone: normalizedPhone,
          status: studentStatus,
        });

      if (createStudentError || !createdStudent) {
        return {
          success: false,
          error: mapUpdateManagerUserError(
            createStudentError?.message ?? "Failed to create student profile."
          ),
        };
      }

      studentProfileId = createdStudent.id;
      studentFullName = normalizedFullName;
      studentBirthDate = normalizedBirthDate;
      studentPhone = normalizedPhone;
      studentStatusValue = studentStatus;
    }
  } else {
    // Intentionally leave student_profiles intact when demoting so the account
    // can be switched back to student later without recreating profile data.
    const retainedStudent =
      await studentProfileRepository.findStudentProfileByUserId(
        adminClient,
        userId
      );

    if (retainedStudent.data) {
      studentProfileId = retainedStudent.data.id;
      studentFullName = retainedStudent.data.full_name;
      studentBirthDate = retainedStudent.data.birth_date;
      studentPhone = retainedStudent.data.phone;
      studentStatusValue = mapStudentStatus(retainedStudent.data.status);
    }
  }

  const user: ManagerUserRow = {
    id: userId,
    full_name: updatedProfile.full_name,
    role,
    is_instructor,
    created_at:
      updatedProfile.created_at ?? authUserResult.data.user.created_at,
    email: normalizedEmail,
    ...(studentProfileId
      ? {
          student_profile_id: studentProfileId,
          student_full_name: studentFullName,
          student_birth_date: studentBirthDate,
          student_phone: studentPhone,
          student_status: studentStatusValue,
        }
      : {}),
  };

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "profiles",
    record_id: userId,
    old_data: {
      full_name: existingProfile.data.full_name,
      role: previousRole,
      email: previousEmail,
      is_instructor: previousIsInstructor,
    },
    new_data: {
      full_name: normalizedFullName,
      role,
      email: normalizedEmail,
      is_instructor,
      password_changed: Boolean(nextPassword),
      ...(studentProfileId
        ? {
            student_profile_id: studentProfileId,
            student_full_name: studentFullName,
            student_status: studentStatusValue,
          }
        : {}),
    },
    metadata: {
      note:
        previousRole === ROLES.STUDENT && role !== ROLES.STUDENT
          ? "User role updated; student profile retained."
          : "User account updated.",
    },
  });

  clearCachedSessionShell(userId);

  return {
    success: true,
    user,
    message: "User updated.",
  };
}
