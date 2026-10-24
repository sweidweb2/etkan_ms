import "server-only";

import { getAuthCallbackUrl } from "@/lib/config/site";
import { getPostLoginRedirect } from "@/lib/auth/redirect";
import { warmJwks } from "@/lib/auth/jwks-cache";
import { clearCachedRolePermissionKeys } from "@/lib/auth/role-permissions-cache";
import { setCachedSessionShell } from "@/lib/auth/session-shell-cache";
import { ROUTES } from "@/lib/constants/routes";
import { appendQueryParam } from "@/lib/url/append-query-param";
import { loginSchema, signupSchema } from "@/lib/validators/auth/auth";
import { roleSchema } from "@/lib/validators/role";
import * as appSettingsRepository from "@/repositories/app-settings.repository";
import * as authRepository from "@/repositories/auth.repository";
import * as profileRepository from "@/repositories/profile.repository";
import { ROLES, type RoleValue } from "@/lib/constants/roles";
import { isNavTimingEnabled, navTimingServerLog } from "@/lib/debug/nav-timing";
import { ensureStudentRegistration } from "@/services/auth/profile.service";
import { getEffectivePermissionsForUserCached } from "@/services/auth/authorization.service";
import {
  roleFromAuthMetadata,
  roleFromJwtClaims,
  syncAuthUserRole,
} from "@/services/auth/role.service";
import { displayNameFromAuthUser } from "@/services/auth/user-display.service";
import type { LoginResult, SignupResult } from "@/types/auth";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const MAINTENANCE_LOGIN_ERROR =
  "The app is under maintenance. Please try again later.";

/**
 * Block every role except manager at session-create time only (login,
 * signup auto-session, auth callback). Existing sessions stay valid;
 * middleware does not re-check on every navigation.
 */
export async function rejectIfMaintenanceBlocksRole(
  client: Supabase,
  role: RoleValue
): Promise<string | null> {
  if (role === ROLES.MANAGER) {
    return null;
  }

  const maintenanceMode =
    await appSettingsRepository.getMaintenanceMode(client);

  return maintenanceMode ? MAINTENANCE_LOGIN_ERROR : null;
}

function mapAuthError(message: string): string {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid email or password")
  ) {
    return "Invalid email or password.";
  }

  if (normalized.includes("email not confirmed")) {
    return "Please confirm your email before signing in.";
  }

  return "Unable to sign in. Please try again.";
}

function mapSignupError(message: string): string {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("already registered") ||
    normalized.includes("already exists")
  ) {
    return "An account with this email already exists.";
  }

  if (normalized.includes("password")) {
    return "Password does not meet requirements.";
  }

  return "Unable to create account. Please try again.";
}

export async function login(
  client: Supabase,
  input: { email: string; password: string; next?: string | null }
): Promise<LoginResult> {
  const parsed = loginSchema.safeParse({
    email: input.email,
    password: input.password,
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors,
    };
  }

  const debugOn = isNavTimingEnabled();
  const signInStart = debugOn ? performance.now() : 0;
  const { data, error } = await authRepository.signInWithPassword(
    client,
    parsed.data.email,
    parsed.data.password
  );
  const signInMs = debugOn ? performance.now() - signInStart : 0;

  if (error || !data.user) {
    return {
      success: false,
      error: mapAuthError(error?.message ?? "Sign in failed."),
    };
  }

  const user = data.user;
  const claimsRole = roleFromAuthMetadata(user);
  const shellStart = debugOn ? performance.now() : 0;
  const profileResult = await profileRepository.findProfileById(client, user.id);

  // Warm JWKS in parallel with role resolution below when needed.
  const jwksWarm = warmJwks();

  const profileRole = roleSchema.safeParse(profileResult.data?.role);
  const role: RoleValue =
    claimsRole ??
    (profileRole.success ? profileRole.data : null) ??
    ROLES.STUDENT;

  // Bust process TTL so login picks up grants after seed:rbac without waiting 15m.
  clearCachedRolePermissionKeys(role);

  const [permissions] = await Promise.all([
    getEffectivePermissionsForUserCached(user.id, role),
    jwksWarm,
  ]);

  const maintenanceError = await rejectIfMaintenanceBlocksRole(client, role);
  if (maintenanceError) {
    await authRepository.signOut(client);
    return {
      success: false,
      error: maintenanceError,
    };
  }

  setCachedSessionShell(user.id, {
    role,
    displayName: displayNameFromAuthUser(
      user,
      profileResult.data?.username ?? null
    ),
    isInstructor: profileResult.data?.is_instructor === true,
    isMentor: profileResult.data?.is_mentor === true,
    permissionKeys: [...permissions],
    cachedClaimsRole: claimsRole,
  });
  const shellMs = debugOn ? performance.now() - shellStart : 0;

  if (debugOn) {
    navTimingServerLog("login", "login", {
      signIn: signInMs,
      shell: shellMs,
    });
  }

  return {
    success: true,
    redirectTo: getPostLoginRedirect(role, input.next),
  };
}

export async function logout(client: Supabase): Promise<void> {
  const { error } = await authRepository.signOut(client);

  if (error) {
    throw new Error(error.message);
  }
}

export async function getCurrentUser(client: Supabase) {
  const { data, error } = await authRepository.getUser(client);

  if (error) {
    return null;
  }

  return data.user;
}

export type SessionAuthIdentity = {
  user: User;
  /** Role from verified JWT / auth metadata when present (skip profiles.role). */
  claimsRole: RoleValue | null;
};

type JwtClaimsLike = {
  sub: string;
  email?: unknown;
  app_metadata?: { role?: unknown } | null;
  user_metadata?: Record<string, unknown> | null;
  role?: unknown;
};

/**
 * Prefer getClaims (no Auth round-trip) over getUser for RSC session packs.
 * Falls back to getUser when claims are unavailable.
 */
export async function getSessionAuthIdentity(
  client: Supabase
): Promise<SessionAuthIdentity | null> {
  const { data: claimsData, error: claimsError } =
    await authRepository.getClaims(client);

  if (!claimsError && claimsData?.claims?.sub) {
    const claims = claimsData.claims as JwtClaimsLike;
    const email = typeof claims.email === "string" ? claims.email : undefined;
    const user = {
      id: claims.sub,
      email,
      app_metadata: claims.app_metadata ?? {},
      user_metadata: claims.user_metadata ?? {},
      aud: "authenticated",
      created_at: "",
    } as User;

    return {
      user,
      claimsRole: roleFromJwtClaims(claims),
    };
  }

  const user = await getCurrentUser(client);
  if (!user) {
    return null;
  }

  return {
    user,
    claimsRole: roleFromAuthMetadata(user),
  };
}

export async function register(
  authClient: Supabase,
  adminClient: Supabase,
  input: {
    username: string;
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
    birthDate?: string | null;
    phone?: string | null;
  }
): Promise<SignupResult> {
  const parsed = signupSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { username, fullName, email, password, birthDate, phone } = parsed.data;

  const existingUsername = await profileRepository.findProfileByUsername(
    adminClient,
    username
  );

  if (existingUsername.data) {
    return {
      success: false,
      error: "This username is already taken.",
      fieldErrors: { username: ["This username is already taken."] },
    };
  }

  const { data: authData, error: signUpError } = await authRepository.signUp(
    authClient,
    {
      email,
      password,
      fullName,
      username,
      emailRedirectTo: getAuthCallbackUrl(),
      role: ROLES.STUDENT,
    }
  );

  if (signUpError || !authData.user) {
    return {
      success: false,
      error: mapSignupError(signUpError?.message ?? "Sign up failed."),
    };
  }

  const authUserId = authData.user.id;

  try {
    await ensureStudentRegistration(adminClient, {
      authId: authUserId,
      username,
      email,
      fullName,
      birthDate,
      phone,
      role: ROLES.STUDENT,
    });
    await syncAuthUserRole(adminClient, authUserId, ROLES.STUDENT);
  } catch (err) {
    await authRepository.deleteAuthUser(adminClient, authUserId);
    const message = err instanceof Error ? err.message : "Registration failed.";
    return {
      success: false,
      error: message,
    };
  }

  const requiresEmailConfirmation = !authData.session;

  if (requiresEmailConfirmation) {
    return {
      success: true,
      requiresEmailConfirmation: true,
      redirectTo: `${ROUTES.LOGIN}?message=confirm_email`,
    };
  }

  // Signup created a session (auto sign-in) — same maintenance gate as login.
  const maintenanceError = await rejectIfMaintenanceBlocksRole(
    authClient,
    ROLES.STUDENT
  );
  if (maintenanceError) {
    await authRepository.signOut(authClient);
    return {
      success: false,
      error: maintenanceError,
    };
  }

  return {
    success: true,
    requiresEmailConfirmation: false,
    redirectTo: appendQueryParam(
      getPostLoginRedirect(ROLES.STUDENT),
      "toast",
      "signed_up"
    ),
  };
}
