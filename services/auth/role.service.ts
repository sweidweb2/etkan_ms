import "server-only";

import { resolveEffectiveClaimsRole } from "@/lib/auth/claims-role-override-cache";
import { ROLES, type RoleValue } from "@/lib/constants/roles";
import { roleSchema } from "@/lib/validators/role";
import * as authRepository from "@/repositories/auth.repository";
import * as profileRepository from "@/repositories/profile.repository";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

function roleFromMetadataRole(raw: unknown): RoleValue | null {
  const parsed = roleSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/**
 * Role from Auth app_metadata only. Never trust user_metadata.role —
 * clients can typically write that field.
 */
export function roleFromAuthMetadata(user: User): RoleValue | null {
  return roleFromMetadataRole(user.app_metadata?.role);
}

/**
 * Role embedded in a verified JWT (getClaims) — no DB round-trip.
 * Prefer app_metadata.role; ignore user_metadata.role.
 */
export function roleFromJwtClaims(claims: {
  app_metadata?: { role?: unknown } | null;
  user_metadata?: { role?: unknown } | null;
  role?: unknown;
}): RoleValue | null {
  const raw = claims.app_metadata?.role ?? claims.role;
  return roleFromMetadataRole(raw);
}

async function profileRoleClient(): Promise<Supabase> {
  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  return createSupabaseAdminClient();
}

export async function resolveUserRole(
  _client: Supabase,
  authUser: User
): Promise<RoleValue> {
  // profiles SELECT is revoked from authenticated; always use service role.
  const adminClient = await profileRoleClient();
  const { data, error } = await profileRepository.findRoleById(
    adminClient,
    authUser.id
  );

  if (!error && data?.role) {
    const parsed = roleSchema.safeParse(data.role);
    if (parsed.success) {
      return parsed.data;
    }
  }

  return roleFromAuthMetadata(authUser) ?? ROLES.STUDENT;
}

/**
 * Middleware-fast role: prefer verified JWT claims, else profiles.role by id.
 * Skips Auth-server getUser when claims already carry the role.
 *
 * After an admin role write, a process-local override may force the new role
 * until the access token refreshes (JWT app_metadata does not invalidate).
 * Profile fallback uses the admin client (authenticated table SELECT is revoked).
 */
export async function resolveUserRoleForMiddleware(
  _client: Supabase,
  input: { userId: string; claimsRole: RoleValue | null }
): Promise<RoleValue> {
  const effectiveClaimsRole = resolveEffectiveClaimsRole(
    input.userId,
    input.claimsRole
  );

  if (effectiveClaimsRole) {
    return effectiveClaimsRole;
  }

  const adminClient = await profileRoleClient();
  const { data, error } = await profileRepository.findRoleById(
    adminClient,
    input.userId
  );

  if (!error && data?.role) {
    const parsed = roleSchema.safeParse(data.role);
    if (parsed.success) {
      return parsed.data;
    }
  }

  return ROLES.STUDENT;
}

/** Resolve `profiles.is_instructor` for portal / path-access gates. */
export async function resolveIsInstructor(
  _client: Supabase,
  authUserId: string
): Promise<boolean> {
  if (!authUserId) {
    return false;
  }

  const adminClient = await profileRoleClient();
  const { data, error } = await profileRepository.findProfileById(
    adminClient,
    authUserId
  );

  if (error || !data) {
    return false;
  }

  return data.is_instructor === true;
}

export async function syncAuthUserRole(
  adminClient: Supabase,
  authUserId: string,
  role: RoleValue
): Promise<void> {
  const { error } = await authRepository.updateAuthUserRole(
    adminClient,
    authUserId,
    role
  );

  if (error) {
    throw new Error(error.message);
  }
}
