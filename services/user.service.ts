import { unstable_cache } from "next/cache";
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
} from "@/services/authorization.service";
import { MANAGER_CACHE_TAGS } from "@/lib/cache/manager-list-cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createStaffUserSchema } from "@/lib/validators/manager/create-user";
import { updateManagerUserSchema } from "@/lib/validators/manager/update-user";
import * as authRepository from "@/repositories/auth.repository";
import { clearInstructorWorkshopRelatedData } from "@/lib/manager/instructors/clear-instructor-related";
import * as profileRepository from "@/repositories/profile.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/audit-log.service";
import { syncAuthUserRole } from "@/services/role.service";
import type { FieldErrors } from "@/types/auth";
import type { ManagerUserRow } from "@/types/manager-user";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

type StaffWelcomeEmailPayload = {
  email: string;
  username: string;
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

async function mapProfileToManagerUserRow(
  adminClient: Supabase,
  profile: {
    id: string;
    username: string | null;
    role: string;
    is_instructor: boolean;
    created_at: string | null;
  }
): Promise<ManagerUserRow | null> {
  const { data: authData, error } = await authRepository.getAuthUserById(
    adminClient,
    profile.id
  );

  if (error || !authData.user) {
    return null;
  }

  return {
    id: profile.id,
    username: profile.username,
    role: profile.role as RoleValue,
    is_instructor: profile.is_instructor,
    created_at: profile.created_at ?? authData.user.created_at,
    email: authData.user.email ?? "",
  };
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

  const users = await Promise.all(
    profiles.map((profile) => mapProfileToManagerUserRow(adminClient, profile))
  );

  const mappedUsers = users.filter((user): user is ManagerUserRow => user !== null);
  const allUserIds = mappedUsers.map((user) => user.id);

  const studentProfilesResult =
    await studentProfileRepository.listStudentProfileDetailsByUserIds(
      adminClient,
      allUserIds
    );

  if (studentProfilesResult.error) {
    throw new Error(studentProfilesResult.error.message);
  }

  const studentProfileByUserId = new Map(
    (studentProfilesResult.data ?? []).map((row) => [row.user_id, row])
  );

  return mappedUsers.map((user) => {
    const studentProfile = studentProfileByUserId.get(user.id);

    if (!studentProfile) {
      return user.role === ROLES.STUDENT
        ? { ...user, student_profile_id: null }
        : user;
    }

    // Keep student_profiles attributes even when role is no longer student so
    // demoted accounts can be switched back without losing profile data.
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
 */
export async function listUsersForManager(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerUserRow[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.USERS_VIEW);
  return listUsersForManagerCached();
}

export async function createStaffUser(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    username: string;
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

  const { username, email, password, role, is_instructor } = parsed.data;

  if (!MANAGER_CREATABLE_ROLES.includes(role)) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: { role: ["Please select a valid staff role."] },
    };
  }

  const normalizedUsername = username.trim();
  const normalizedEmail = email.trim();

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
      username: normalizedUsername,
      fullName: normalizedUsername,
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
        username: normalizedUsername,
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
      username: normalizedUsername,
      role,
      is_instructor,
      created_at: authData.user.created_at,
      email: normalizedEmail,
    };

    try {
      await notifyStaffUserCreated({
        email: normalizedEmail,
        username: normalizedUsername,
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
        username: normalizedUsername,
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
    username: string;
    email: string;
    role: string;
    is_instructor: boolean;
    fullName?: string;
    birthDate?: string | null;
    phone?: string | null;
    status?: string;
  }
): Promise<UpdateManagerUserResult> {
  const unauthorized = await getUnauthorizedError(adminClient, actorUserId, PERMISSIONS.USERS_UPDATE);
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = updateManagerUserSchema.safeParse({
    username: input.username,
    email: input.email,
    role: input.role,
    is_instructor: input.is_instructor,
    fullName: input.fullName,
    birthDate: input.birthDate ?? "",
    phone: input.phone ?? "",
    status: input.status,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { userId } = input;
  const { username, email, role, is_instructor } = parsed.data;
  const normalizedUsername = username.trim();
  const normalizedEmail = email.trim();
  const normalizedFullName = normalizeOptionalString(parsed.data.fullName);
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

  const existingUsername = await profileRepository.findProfileByUsername(
    adminClient,
    normalizedUsername
  );

  if (existingUsername.data && existingUsername.data.id !== userId) {
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

  const authUserResult = await authRepository.getAuthUserById(
    adminClient,
    userId
  );

  if (authUserResult.error || !authUserResult.data?.user) {
    return { success: false, error: "User not found." };
  }

  const previousRole = existingProfile.data.role as RoleValue;
  const previousIsInstructor = existingProfile.data.is_instructor;
  const previousEmail = authUserResult.data.user.email ?? null;

  const { data: updatedProfile, error: profileError } =
    await profileRepository.updateProfileById(adminClient, userId, {
      username: normalizedUsername,
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
      username: normalizedUsername,
      ...(normalizedFullName ? { fullName: normalizedFullName } : {}),
    }
  );

  if (authError) {
    return {
      success: false,
      error: mapUpdateManagerUserError(authError.message),
    };
  }

  if (previousRole !== role) {
    try {
      await syncAuthUserRole(adminClient, userId, role);
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
    if (!normalizedFullName) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: { fullName: ["Full name is required."] },
      };
    }

    const existingStudent =
      await studentProfileRepository.findStudentProfileByUserId(
        adminClient,
        userId
      );

    if (existingStudent.error) {
      return {
        success: false,
        error: mapUpdateManagerUserError(existingStudent.error.message),
      };
    }

    if (existingStudent.data) {
      // Existing student_profiles row: override with the submitted form data.
      const { data: updatedStudent, error: studentProfileError } =
        await studentProfileRepository.updateStudentProfileById(
          adminClient,
          existingStudent.data.id,
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

      const createdDetails =
        await studentProfileRepository.findStudentProfileById(
          adminClient,
          createdStudent.id
        );

      if (createdDetails.error || !createdDetails.data) {
        return {
          success: false,
          error: mapUpdateManagerUserError(
            createdDetails.error?.message ?? "Failed to create student profile."
          ),
        };
      }

      studentProfileId = createdDetails.data.id;
      studentFullName = createdDetails.data.full_name;
      studentBirthDate = createdDetails.data.birth_date;
      studentPhone = createdDetails.data.phone;
      studentStatusValue = mapStudentStatus(createdDetails.data.status);
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
    username: updatedProfile.username,
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
      username: existingProfile.data.username,
      role: previousRole,
      email: previousEmail,
      is_instructor: previousIsInstructor,
    },
    new_data: {
      username: normalizedUsername,
      role,
      email: normalizedEmail,
      is_instructor,
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

  return {
    success: true,
    user,
    message: "User updated.",
  };
}
