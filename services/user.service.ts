import { MANAGER_CREATABLE_ROLES } from "@/lib/constants/manager-user-roles";
import { ROLES, type RoleValue } from "@/lib/constants/roles";
import { createStaffUserSchema } from "@/lib/validators/manager/create-user";
import * as authRepository from "@/repositories/auth.repository";
import * as profileRepository from "@/repositories/profile.repository";
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

function assertManagerRole(actorRole: RoleValue | null): void {
  if (actorRole !== ROLES.MANAGER) {
    throw new Error("Unauthorized.");
  }
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
  _payload: StaffWelcomeEmailPayload
): Promise<void> {
  // Intentionally no-op until email infrastructure is added.
}

async function mapProfileToManagerUserRow(
  adminClient: Supabase,
  profile: {
    id: string;
    username: string | null;
    role: string;
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
    created_at: profile.created_at ?? authData.user.created_at,
    email: authData.user.email ?? "",
  };
}

/** Lists all users for the manager panel. Uses admin client (profiles RLS is self-only). */
export async function listUsersForManager(
  adminClient: Supabase,
  actorRole: RoleValue | null
): Promise<ManagerUserRow[]> {
  assertManagerRole(actorRole);

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

  return users.filter((user): user is ManagerUserRow => user !== null);
}

export async function createStaffUser(
  adminClient: Supabase,
  actorRole: RoleValue | null,
  actor: AuditActor,
  input: {
    username: string;
    email: string;
    password: string;
    role: string;
  }
): Promise<CreateStaffUserResult> {
  if (actorRole !== ROLES.MANAGER) {
    return { success: false, error: "Unauthorized." };
  }

  const parsed = createStaffUserSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { username, email, password, role } = parsed.data;

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
