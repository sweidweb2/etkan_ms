/**
 * Short-lived per-user process cache for panel shell identity
 * (role, displayName, isInstructor, permission keys).
 *
 * Every navigation still verifies JWT via getClaims; this avoids repeating
 * profiles + role_permissions round-trips on sidebar hops within the TTL.
 *
 * Same class as maintenance-mode-cache: one Node process, not multi-region shared.
 */

import type { PermissionKey } from "@/lib/constants/permissions";
import type { RoleValue } from "@/lib/constants/roles";

/** 5 min — longer than role-perms co-expiry cliff; still bust on logout/RBAC. */
export const SESSION_SHELL_TTL_MS = 300_000;

export type SessionShellPayload = {
  role: RoleValue;
  displayName: string;
  isInstructor: boolean;
  permissionKeys: PermissionKey[];
  /** JWT claims role at store time (for mismatch bust). */
  cachedClaimsRole: RoleValue | null;
};

type CacheEntry = SessionShellPayload & {
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();

export function getCachedSessionShell(
  userId: string
): SessionShellPayload | null {
  if (!userId) {
    return null;
  }

  const entry = cache.get(userId);
  if (!entry) {
    return null;
  }

  if (Date.now() >= entry.expiresAt) {
    cache.delete(userId);
    return null;
  }

  // Sliding TTL: active sidebar hops keep the shell warm without a cliff.
  entry.expiresAt = Date.now() + SESSION_SHELL_TTL_MS;

  const payload: SessionShellPayload = {
    role: entry.role,
    displayName: entry.displayName,
    isInstructor: entry.isInstructor,
    permissionKeys: entry.permissionKeys,
    cachedClaimsRole: entry.cachedClaimsRole,
  };
  return payload;
}

/**
 * True when a cached shell can be reused for this request's JWT claims role.
 * If claims carry a role and it differs from the cached role, bust.
 */
export function isSessionShellCompatibleWithClaims(
  entry: SessionShellPayload,
  claimsRole: RoleValue | null
): boolean {
  if (claimsRole == null) {
    return true;
  }
  return claimsRole === entry.role;
}

export function setCachedSessionShell(
  userId: string,
  payload: SessionShellPayload,
  ttlMs = SESSION_SHELL_TTL_MS
): void {
  if (!userId) {
    return;
  }

  cache.set(userId, {
    ...payload,
    expiresAt: Date.now() + ttlMs,
  });
}

/** Clear one user, or all entries when `userId` is omitted. */
export function clearCachedSessionShell(userId?: string): void {
  if (userId) {
    cache.delete(userId);
    return;
  }
  cache.clear();
}
