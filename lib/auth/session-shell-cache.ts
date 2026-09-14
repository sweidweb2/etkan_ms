/**
 * Short-lived per-user process cache for panel shell identity
 * (role, displayName, isInstructor, **effective** permission keys).
 *
 * Every navigation still verifies JWT via getClaims; this avoids repeating
 * profiles + role_permissions + user_permissions round-trips on sidebar hops
 * within the TTL.
 *
 * Bust:
 * - `clearCachedSessionShell(userId)` after that user’s UBAC overlay changes
 * - `clearCachedSessionShell()` (all) after role-matrix RBAC saves
 * - logout / identity writes as today
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
const inflight = new Map<string, Promise<SessionShellPayload>>();

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

/**
 * Coalesce concurrent shell builds for the same user (cross-request singleflight).
 * Callers still verify JWT per request; only the MISS build is shared.
 */
export async function getOrCreateSessionShellInflight(
  userId: string,
  build: () => Promise<SessionShellPayload>
): Promise<{ payload: SessionShellPayload; shared: boolean }> {
  if (!userId) {
    return { payload: await build(), shared: false };
  }

  const existing = inflight.get(userId);
  if (existing) {
    return { payload: await existing, shared: true };
  }

  const promise = build().finally(() => {
    inflight.delete(userId);
  });
  inflight.set(userId, promise);
  return { payload: await promise, shared: false };
}

/** Clear one user, or all entries when `userId` is omitted. */
export function clearCachedSessionShell(userId?: string): void {
  if (userId) {
    cache.delete(userId);
    inflight.delete(userId);
    return;
  }
  cache.clear();
  inflight.clear();
}
