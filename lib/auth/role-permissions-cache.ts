/**
 * Short-lived process cache for role → permission keys (role matrix only).
 * Avoids repeating role_permissions round-trips on session_pack MISS
 * within the TTL window (same class as session-shell-cache).
 *
 * Effective session permissions are these role keys only. Clear with
 * `clearCachedRolePermissionKeys` on Manager RBAC role-matrix saves (and
 * clear session shells so users pick up the new effective set).
 */

import type { PermissionKey } from "@/lib/constants/permissions";
import type { RoleValue } from "@/lib/constants/roles";

/** 15 min — outlives shell so shell MISS usually pays profile only. */
export const ROLE_PERMISSIONS_TTL_MS = 900_000;

type CacheEntry = {
  keys: PermissionKey[];
  expiresAt: number;
};

const cache = new Map<RoleValue, CacheEntry>();

export function getCachedRolePermissionKeys(
  role: RoleValue
): PermissionKey[] | null {
  const entry = cache.get(role);
  if (!entry) {
    return null;
  }

  if (Date.now() >= entry.expiresAt) {
    cache.delete(role);
    return null;
  }

  return entry.keys;
}

export function setCachedRolePermissionKeys(
  role: RoleValue,
  keys: readonly PermissionKey[],
  ttlMs = ROLE_PERMISSIONS_TTL_MS
): void {
  cache.set(role, {
    keys: [...keys],
    expiresAt: Date.now() + ttlMs,
  });
}

/** Clear one role, or all entries when `role` is omitted. */
export function clearCachedRolePermissionKeys(role?: RoleValue): void {
  if (role) {
    cache.delete(role);
    return;
  }
  cache.clear();
}
