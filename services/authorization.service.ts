import { cache } from "react";
import {
  isPermissionKey,
  type PermissionKey,
} from "@/lib/constants/permissions";
import { roleSchema } from "@/lib/validators/role";
import * as permissionRepository from "@/repositories/permission.repository";
import * as profileRepository from "@/repositories/profile.repository";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export const UNAUTHORIZED_MESSAGE = "Unauthorized.";

const EMPTY_PERMISSIONS: ReadonlySet<PermissionKey> = new Set();

async function loadUserPermissionsWithClient(
  client: Supabase,
  userId: string
): Promise<ReadonlySet<PermissionKey>> {
  if (!userId) {
    return EMPTY_PERMISSIONS;
  }

  const { data: profile, error: profileError } =
    await profileRepository.findRoleById(client, userId);

  if (profileError || !profile?.role) {
    return EMPTY_PERMISSIONS;
  }

  const parsedRole = roleSchema.safeParse(profile.role);
  if (!parsedRole.success) {
    return EMPTY_PERMISSIONS;
  }

  const { data: grants, error: grantsError } =
    await permissionRepository.listPermissionKeysByRole(
      client,
      parsedRole.data
    );

  if (grantsError || !grants) {
    return EMPTY_PERMISSIONS;
  }

  const keys = new Set<PermissionKey>();
  for (const row of grants) {
    if (isPermissionKey(row.permission_key)) {
      keys.add(row.permission_key);
    }
  }

  return keys;
}

/**
 * Load permissions for a user using the provided client (uncached).
 * Prefer this in unit tests and scripts.
 */
export async function getUserPermissions(
  client: Supabase,
  userId: string
): Promise<ReadonlySet<PermissionKey>> {
  return loadUserPermissionsWithClient(client, userId);
}

const loadUserPermissionsCached = cache(async (userId: string) => {
  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  const client = createSupabaseAdminClient();
  return loadUserPermissionsWithClient(client, userId);
});

/**
 * Request-scoped cached load (React `cache`). Uses the admin client.
 * Use from RSC / server actions when the same user is checked many times.
 */
export async function getUserPermissionsCached(
  userId: string
): Promise<ReadonlySet<PermissionKey>> {
  return loadUserPermissionsCached(userId);
}

export function hasPermissionInSet(
  permissions: ReadonlySet<PermissionKey>,
  permission: string
): boolean {
  if (!isPermissionKey(permission)) {
    return false;
  }
  return permissions.has(permission);
}

export function hasAnyPermissionInSet(
  permissions: ReadonlySet<PermissionKey>,
  candidates: readonly string[]
): boolean {
  return candidates.some((permission) =>
    hasPermissionInSet(permissions, permission)
  );
}

export function hasAllPermissionsInSet(
  permissions: ReadonlySet<PermissionKey>,
  candidates: readonly string[]
): boolean {
  if (candidates.length === 0) {
    return true;
  }
  return candidates.every((permission) =>
    hasPermissionInSet(permissions, permission)
  );
}

export function requirePermissionInSet(
  permissions: ReadonlySet<PermissionKey>,
  permission: string
): void {
  if (!hasPermissionInSet(permissions, permission)) {
    throw new Error(UNAUTHORIZED_MESSAGE);
  }
}

export async function hasPermission(
  client: Supabase,
  userId: string,
  permission: string
): Promise<boolean> {
  if (!isPermissionKey(permission)) {
    return false;
  }
  const permissions = await getUserPermissions(client, userId);
  return hasPermissionInSet(permissions, permission);
}

export async function hasAnyPermission(
  client: Supabase,
  userId: string,
  candidates: readonly string[]
): Promise<boolean> {
  const permissions = await getUserPermissions(client, userId);
  return hasAnyPermissionInSet(permissions, candidates);
}

export async function hasAllPermissions(
  client: Supabase,
  userId: string,
  candidates: readonly string[]
): Promise<boolean> {
  const permissions = await getUserPermissions(client, userId);
  return hasAllPermissionsInSet(permissions, candidates);
}

export async function requirePermission(
  client: Supabase,
  userId: string,
  permission: string
): Promise<void> {
  const allowed = await hasPermission(client, userId, permission);
  if (!allowed) {
    throw new Error(UNAUTHORIZED_MESSAGE);
  }
}

/**
 * Service-layer gate: throws `Unauthorized.` when user id is missing or permission is denied.
 */
export async function assertPermission(
  client: Supabase,
  userId: string | null | undefined,
  permission: PermissionKey
): Promise<void> {
  if (!userId) {
    throw new Error(UNAUTHORIZED_MESSAGE);
  }
  await requirePermission(client, userId, permission);
}

/**
 * For `{ success: false, error }` mutation paths. Returns error message or null when allowed.
 */
export async function getUnauthorizedError(
  client: Supabase,
  userId: string | null | undefined,
  permission: PermissionKey
): Promise<string | null> {
  if (!userId) {
    return UNAUTHORIZED_MESSAGE;
  }
  const allowed = await hasPermission(client, userId, permission);
  return allowed ? null : UNAUTHORIZED_MESSAGE;
}
