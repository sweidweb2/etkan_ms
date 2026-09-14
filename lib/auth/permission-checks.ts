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

export type MergePermissionSetsInput = {
  roleKeys: Iterable<string>;
  allows?: Iterable<string>;
  denies?: Iterable<string>;
};

/**
 * Effective permissions: `(role ∪ allows) − denies`.
 * Deny wins over both role grants and user allows. Invalid keys are skipped.
 */
export function mergePermissionSets(
  input: MergePermissionSetsInput
): ReadonlySet<PermissionKey> {
  const effective = new Set<PermissionKey>();

  for (const key of input.roleKeys) {
    if (isPermissionKey(key)) {
      effective.add(key);
    }
  }

  if (input.allows) {
    for (const key of input.allows) {
      if (isPermissionKey(key)) {
        effective.add(key);
      }
    }
  }

  if (input.denies) {
    for (const key of input.denies) {
      if (isPermissionKey(key)) {
        effective.delete(key);
      }
    }
  }

  return effective;
}
