import { cache } from "react";
import {
  UNAUTHORIZED_MESSAGE,
  hasAllPermissionsInSet,
  hasAnyPermissionInSet,
  hasPermissionInSet,
  mergePermissionSets,
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
  mergePermissionSets,
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

type OverlayParts = {
  allows: ReadonlySet<PermissionKey>;
  denies: ReadonlySet<PermissionKey>;
};

const EMPTY_OVERLAY: OverlayParts = {
  allows: EMPTY_PERMISSIONS,
  denies: EMPTY_PERMISSIONS,
};

/**
 * Load UBAC overlay rows. No process-TTL cache (C7): overlay is small and
 * session shell already caches the merged effective set for ~5m per user.
 */
async function loadUserOverlayPartsWithClient(
  client: Supabase,
  userId: string
): Promise<OverlayParts> {
  if (!userId) {
    return EMPTY_OVERLAY;
  }

  const { data: rows, error } =
    await permissionRepository.listUserPermissionRows(client, userId);

  if (error || !rows || rows.length === 0) {
    return EMPTY_OVERLAY;
  }

  const allows = new Set<PermissionKey>();
  const denies = new Set<PermissionKey>();

  for (const row of rows) {
    if (!isPermissionKey(row.permission_key)) {
      continue;
    }
    if (row.effect === "allow") {
      allows.add(row.permission_key);
    } else if (row.effect === "deny") {
      denies.add(row.permission_key);
    }
  }

  return { allows, denies };
}

async function loadEffectivePermissionsWithClient(
  client: Supabase,
  userId: string,
  role: RoleValue
): Promise<ReadonlySet<PermissionKey>> {
  const [roleKeys, overlay] = await Promise.all([
    loadPermissionsForRoleWithClient(client, role),
    loadUserOverlayPartsWithClient(client, userId),
  ]);

  return mergePermissionSets({
    roleKeys,
    allows: overlay.allows,
    denies: overlay.denies,
  });
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

  return loadEffectivePermissionsWithClient(client, userId, role);
}

/**
 * Load **effective** permissions for a user using the provided client (uncached).
 * Prefer this in unit tests and scripts.
 * Formula: `(role ∪ allows) − denies`.
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

const loadUserOverlayPartsCached = cache(async (userId: string) => {
  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  const client = createSupabaseAdminClient();
  return loadUserOverlayPartsWithClient(client, userId);
});

/**
 * Request-scoped **role matrix** grants only (no UBAC overlay).
 * Use for Manager RBAC UI / seeding comparisons — **not** for authorizing a user.
 * For user checks, use `getUserPermissionsCached` / `getEffectivePermissionsForUserCached`.
 */
export async function getPermissionsForRoleCached(
  role: RoleValue
): Promise<ReadonlySet<PermissionKey>> {
  return loadPermissionsForRoleCached(role);
}

/**
 * Request-scoped effective permissions for a known user + role.
 * Loads role grants (15m process cache) ∥ user overlay (request cache only), then merges.
 * Prefer when JWT / session already resolved the role (session pack MISS, login warm).
 *
 * After overlay edits: call `clearCachedSessionShell(userId)` so the next pack rebuilds.
 * Role-matrix saves still clear role cache + all shells as today.
 */
export async function getEffectivePermissionsForUserCached(
  userId: string,
  role: RoleValue
): Promise<ReadonlySet<PermissionKey>> {
  if (!userId) {
    return EMPTY_PERMISSIONS;
  }

  rememberUserRole(userId, role);

  const [roleKeys, overlay] = await Promise.all([
    loadPermissionsForRoleCached(role),
    loadUserOverlayPartsCached(userId),
  ]);

  return mergePermissionSets({
    roleKeys,
    allows: overlay.allows,
    denies: overlay.denies,
  });
}

/**
 * Request-scoped cached load (React `cache`). Uses the admin client.
 * Returns **effective** keys (role ∪ allow − deny).
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
