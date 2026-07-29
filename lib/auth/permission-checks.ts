import {
  isPermissionKey,
  type PermissionKey,
} from "@/lib/constants/permissions";

export const UNAUTHORIZED_MESSAGE = "Unauthorized.";

/** Sync helpers safe for client components (no Supabase / admin client). */

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
