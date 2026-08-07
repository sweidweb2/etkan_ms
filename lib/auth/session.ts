import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server";
import type { PermissionKey } from "@/lib/constants/permissions";
import type { RoleValue } from "@/lib/constants/roles";
import { getSessionAuthIdentity } from "@/services/auth.service";
import { getUserPermissionsCached } from "@/services/authorization.service";
import type { AuditActor } from "@/services/audit-log.service";
import {
  resolveIsInstructor,
  resolveUserRole,
} from "@/services/role.service";
import { resolveDisplayName } from "@/services/user-display.service";

const EMPTY_PERMISSIONS: ReadonlySet<PermissionKey> = new Set();

export type SessionPack = {
  user: User | null;
  role: RoleValue | null;
  displayName: string;
  isInstructor: boolean;
  permissions: ReadonlySet<PermissionKey>;
};

const EMPTY_SESSION_PACK: SessionPack = {
  user: null,
  role: null,
  displayName: "User",
  isInstructor: false,
  permissions: EMPTY_PERMISSIONS,
};

/**
 * Request-scoped who-am-I pack (user, role, display name, instructor, permissions).
 * Prefer this in layouts; thin helpers below project from the same cache.
 *
 * Auth bootstrap prefers getClaims (local JWT) over getUser (Auth round-trip),
 * matching middleware. JWT role skips a profiles.role fetch when present.
 */
export const getSessionPack = cache(async (): Promise<SessionPack> => {
  const client = await createSupabaseServerComponentClient();
  const identity = await getSessionAuthIdentity(client);

  if (!identity) {
    return EMPTY_SESSION_PACK;
  }

  const { user, claimsRole } = identity;

  const [role, isInstructor, displayName, permissions] = await Promise.all([
    claimsRole
      ? Promise.resolve(claimsRole)
      : resolveUserRole(client, user),
    resolveIsInstructor(client, user.id),
    resolveDisplayName(client, user),
    getUserPermissionsCached(user.id),
  ]);

  return {
    user,
    role,
    displayName,
    isInstructor,
    permissions,
  };
});

export async function getSessionUser() {
  return (await getSessionPack()).user;
}

export async function getSessionRole(): Promise<RoleValue | null> {
  return (await getSessionPack()).role;
}

export async function getSessionIsInstructor(): Promise<boolean> {
  return (await getSessionPack()).isInstructor;
}

export async function getSessionDisplayName(): Promise<string> {
  return (await getSessionPack()).displayName;
}

export async function getSessionAuditActor(): Promise<AuditActor> {
  const pack = await getSessionPack();

  return {
    userId: pack.user?.id ?? null,
    userLabel: pack.displayName || "System",
  };
}
