import "server-only";

import { cache } from "react";
import {
  UNAUTHORIZED_MESSAGE,
  hasAllPermissionsInSet,
  hasAnyPermissionInSet,
  hasPermissionInSet,
} from "@/lib/auth/permission-checks";
import {
  getCachedRolePermissionKeys,
  setCachedRolePermissionKeys,
} from "@/lib/auth/role-permissions-cache";
import {
  isPermissionKey,
  PERMISSIONS,
  type PermissionKey,
} from "@/lib/constants/permissions";
import { ROLES, type RoleValue } from "@/lib/constants/roles";
import { roleSchema } from "@/lib/validators/role";
import * as permissionRepository from "@/repositories/permission.repository";
import * as profileRepository from "@/repositories/profile.repository";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

export {
  UNAUTHORIZED_MESSAGE,
  hasAllPermissionsInSet,
  hasAnyPermissionInSet,
  hasPermissionInSet,
  requirePermissionInSet,
} from "@/lib/auth/permission-checks";

type Supabase = SupabaseClient<Database>;

const EMPTY_PERMISSIONS: ReadonlySet<PermissionKey> = new Set();

/** Request-scoped role hints so permission loads skip a second profiles.role fetch. */
const getKnownRoleHints = cache(() => new Map<string, RoleValue>());

export function rememberUserRole(userId: string, role: RoleValue): void {
  if (!userId) {
    return;
  }
  getKnownRoleHints().set(userId, role);
}

async function loadPermissionsForRoleWithClient(
  client: Supabase,
  role: RoleValue
): Promise<ReadonlySet<PermissionKey>> {
  const { data: grants, error: grantsError } =
    await permissionRepository.listPermissionKeysByRole(client, role);

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

async function resolveRoleForUser(
  client: Supabase,
  userId: string
): Promise<RoleValue | null> {
  const hinted = getKnownRoleHints().get(userId);
  if (hinted) {
    return hinted;
  }

  const { data: profile, error: profileError } =
    await profileRepository.findRoleById(client, userId);

  if (profileError || !profile?.role) {
    return null;
  }

  const parsedRole = roleSchema.safeParse(profile.role);
  if (!parsedRole.success) {
    return null;
  }

  rememberUserRole(userId, parsedRole.data);
  return parsedRole.data;
}

async function loadUserPermissionsWithClient(
  client: Supabase,
  userId: string
): Promise<ReadonlySet<PermissionKey>> {
  if (!userId) {
    return EMPTY_PERMISSIONS;
  }

  const role = await resolveRoleForUser(client, userId);
  if (!role) {
    return EMPTY_PERMISSIONS;
  }

  return loadPermissionsForRoleWithClient(client, role);
}

/**
 * Load permissions for a user using the provided client (uncached).
 * Prefer this in unit tests and scripts.
 * Formula: role grants only.
 */
export async function getUserPermissions(
  client: Supabase,
  userId: string
): Promise<ReadonlySet<PermissionKey>> {
  return loadUserPermissionsWithClient(client, userId);
}

const loadPermissionsForRoleCached = cache(async (role: RoleValue) => {
  const cachedKeys = getCachedRolePermissionKeys(role);
  if (cachedKeys) {
    return new Set<PermissionKey>(cachedKeys);
  }

  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  const client = createSupabaseAdminClient();
  const permissions = await loadPermissionsForRoleWithClient(client, role);
  setCachedRolePermissionKeys(role, [...permissions]);
  return permissions;
});

/**
 * Request-scoped role grants (15m process cache).
 * Use for Manager RBAC UI / seeding comparisons and for authorizing a known role.
 */
export async function getPermissionsForRoleCached(
  role: RoleValue
): Promise<ReadonlySet<PermissionKey>> {
  return loadPermissionsForRoleCached(role);
}

/**
 * Permissions for a known user + role.
 *
 * Name kept for call-site stability. **Not** a UBAC merge — runtime is
 * role grants only (`role_permissions[role]`). Per-user overlays were removed
 * (`user_permissions` dropped). See `docs/[10] Plans/[02] rbac-plus-ubac.md`.
 */
export async function getEffectivePermissionsForUserCached(
  userId: string,
  role: RoleValue
): Promise<ReadonlySet<PermissionKey>> {
  if (!userId) {
    return EMPTY_PERMISSIONS;
  }

  rememberUserRole(userId, role);
  return loadPermissionsForRoleCached(role);
}

/**
 * Request-scoped cached load (React `cache`). Uses the admin client.
 * Returns role permission keys.
 * If `rememberUserRole` ran earlier in the request, skips profiles.role.
 */
export async function getUserPermissionsCached(
  userId: string
): Promise<ReadonlySet<PermissionKey>> {
  if (!userId) {
    return EMPTY_PERMISSIONS;
  }

  const hinted = getKnownRoleHints().get(userId);
  if (hinted) {
    return getEffectivePermissionsForUserCached(userId, hinted);
  }

  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  const client = createSupabaseAdminClient();
  return loadUserPermissionsWithClient(client, userId);
}

/**
 * Request-scoped permission check (uses `getUserPermissionsCached`).
 * The `client` argument is unused for the grants load; kept for call-site compatibility.
 */
export async function hasPermission(
  client: Supabase,
  userId: string,
  permission: string
): Promise<boolean> {
  void client;
  if (!isPermissionKey(permission)) {
    return false;
  }
  const permissions = await getUserPermissionsCached(userId);
  return hasPermissionInSet(permissions, permission);
}

export async function hasAnyPermission(
  client: Supabase,
  userId: string,
  candidates: readonly string[]
): Promise<boolean> {
  void client;
  const permissions = await getUserPermissionsCached(userId);
  return hasAnyPermissionInSet(permissions, candidates);
}

export async function hasAllPermissions(
  client: Supabase,
  userId: string,
  candidates: readonly string[]
): Promise<boolean> {
  void client;
  const permissions = await getUserPermissionsCached(userId);
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
 * One permissions load + all-of check. Prefer this over sequential
 * `assertPermission` calls for independent required keys.
 */
export async function assertPermissions(
  client: Supabase,
  userId: string | null | undefined,
  permissions: readonly PermissionKey[]
): Promise<void> {
  if (!userId) {
    throw new Error(UNAUTHORIZED_MESSAGE);
  }
  if (permissions.length === 0) {
    return;
  }
  const allowed = await hasAllPermissions(client, userId, permissions);
  if (!allowed) {
    throw new Error(UNAUTHORIZED_MESSAGE);
  }
}

/**
 * Student panel self-access: requires `students.view_own`, or falls back to
 * authenticated `student` role (covers stale role-permission cache after seed).
 */
export async function assertStudentSelfAccess(
  client: Supabase,
  userId: string | null | undefined
): Promise<string> {
  if (!userId) {
    throw new Error(UNAUTHORIZED_MESSAGE);
  }

  const allowed = await hasPermission(
    client,
    userId,
    PERMISSIONS.STUDENTS_VIEW_OWN
  );
  if (allowed) {
    return userId;
  }

  const { data: profile, error } = await profileRepository.findProfileById(
    client,
    userId
  );
  if (error) {
    throw new Error(error.message);
  }
  if (profile?.role === ROLES.STUDENT) {
    return userId;
  }

  throw new Error(UNAUTHORIZED_MESSAGE);
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
