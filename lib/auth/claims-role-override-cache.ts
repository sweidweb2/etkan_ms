/**
 * Process-local override when an admin changes a user's role.
 *
 * Supabase `updateUserById({ app_metadata })` does not invalidate existing
 * access tokens, so JWT `app_metadata.role` can stay elevated until refresh.
 * Middleware/session prefer JWT role for the 0ms path — without this Map,
 * demoted users keep elevated panel access until the token expires.
 *
 * Unchanged users never enter this Map → JWT fast path stays intact.
 * Same class as session-shell-cache: one Node process, not multi-region.
 */

import type { RoleValue } from "@/lib/constants/roles";

/** Cover typical access-token lifetime; clear early when JWT catches up. */
export const CLAIMS_ROLE_OVERRIDE_TTL_MS = 60 * 60 * 1000;

type OverrideEntry = {
  role: RoleValue;
  expiresAt: number;
};

const overrides = new Map<string, OverrideEntry>();

export function markClaimsRoleOverride(
  userId: string,
  role: RoleValue,
  ttlMs = CLAIMS_ROLE_OVERRIDE_TTL_MS
): void {
  if (!userId) {
    return;
  }
  overrides.set(userId, {
    role,
    expiresAt: Date.now() + ttlMs,
  });
}

export function getClaimsRoleOverride(userId: string): RoleValue | null {
  if (!userId) {
    return null;
  }

  const entry = overrides.get(userId);
  if (!entry) {
    return null;
  }

  if (Date.now() >= entry.expiresAt) {
    overrides.delete(userId);
    return null;
  }

  return entry.role;
}

export function clearClaimsRoleOverride(userId?: string): void {
  if (userId) {
    overrides.delete(userId);
    return;
  }
  overrides.clear();
}

/**
 * Effective role for middleware/session when JWT may be stale after a write.
 * When JWT matches the override, clear it and restore the normal fast path.
 */
export function resolveEffectiveClaimsRole(
  userId: string,
  claimsRole: RoleValue | null
): RoleValue | null {
  const override = getClaimsRoleOverride(userId);
  if (!override) {
    return claimsRole;
  }

  if (claimsRole === override) {
    clearClaimsRoleOverride(userId);
    return claimsRole;
  }

  return override;
}
