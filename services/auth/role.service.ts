import "server-only";

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

export function roleFromAuthMetadata(user: User): RoleValue | null {
  const raw = user.app_metadata?.role ?? user.user_metadata?.role;
  return roleFromMetadataRole(raw);
}

/** Role embedded in a verified JWT (getClaims) — no DB round-trip. */
export function roleFromJwtClaims(claims: {
  app_metadata?: { role?: unknown } | null;
  user_metadata?: { role?: unknown } | null;
  role?: unknown;
}): RoleValue | null {
  const raw =
    claims.app_metadata?.role ?? claims.user_metadata?.role ?? claims.role;
  return roleFromMetadataRole(raw);
}

export async function resolveUserRole(
  client: Supabase,
  authUser: User
): Promise<RoleValue> {
  const { data, error } = await profileRepository.findRoleById(
    client,
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
 */
export async function resolveUserRoleForMiddleware(
  client: Supabase,
  input: { userId: string; claimsRole: RoleValue | null }
): Promise<RoleValue> {
  if (input.claimsRole) {
    return input.claimsRole;
  }

  const { data, error } = await profileRepository.findRoleById(
    client,
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
  client: Supabase,
  authUserId: string
): Promise<boolean> {
  if (!authUserId) {
    return false;
  }

  const { data, error } = await profileRepository.findProfileById(
    client,
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
