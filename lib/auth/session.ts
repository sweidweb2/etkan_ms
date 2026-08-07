import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server";
import {
  isPermissionKey,
  type PermissionKey,
} from "@/lib/constants/permissions";
import { ROLES, type RoleValue } from "@/lib/constants/roles";
import {
  getCachedSessionShell,
  isSessionShellCompatibleWithClaims,
  setCachedSessionShell,
} from "@/lib/auth/session-shell-cache";
import { timingAsync, timingMark } from "@/lib/debug/request-timing";
import { roleSchema } from "@/lib/validators/role";
import * as profileRepository from "@/repositories/profile.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import { getSessionAuthIdentity } from "@/services/auth.service";
import {
  getPermissionsForRoleCached,
  rememberUserRole,
} from "@/services/authorization.service";
import type { AuditActor } from "@/services/audit-log.service";
import { roleFromAuthMetadata } from "@/services/role.service";
import { displayNameFromAuthUser } from "@/services/user-display.service";

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

function permissionsFromKeys(
  keys: readonly string[]
): ReadonlySet<PermissionKey> {
  const set = new Set<PermissionKey>();
  for (const key of keys) {
    if (isPermissionKey(key)) {
      set.add(key);
    }
  }
  return set;
}

/**
 * Request-scoped who-am-I pack (user, role, display name, instructor, permissions).
 *
 * Every request: cheap getClaims identity.
 * Across navigations: process-TTL shell cache (role / displayName / instructor / perms)
 * keyed by userId — see `session-shell-cache.ts`.
 */
export const getSessionPack = cache(async (): Promise<SessionPack> => {
  timingMark("sessionPack:start");
  const client = await createSupabaseServerComponentClient();
  const identity = await timingAsync("sessionPack:authIdentity", () =>
    getSessionAuthIdentity(client)
  );

  if (!identity) {
    timingMark("sessionPack:empty");
    return EMPTY_SESSION_PACK;
  }

  const { user, claimsRole } = identity;
  timingMark(
    `sessionPack:identity user=${user.id.slice(0, 8)} claimsRole=${claimsRole ?? "none"}`
  );

  const cached = getCachedSessionShell(user.id);
  if (
    cached &&
    isSessionShellCompatibleWithClaims(cached, claimsRole)
  ) {
    timingMark("sessionPack:shellCache:hit");
    rememberUserRole(user.id, cached.role);
    const permissions = permissionsFromKeys(cached.permissionKeys);
    timingMark(
      `sessionPack:done role=${cached.role} instructor=${cached.isInstructor} perms=${permissions.size} source=shellCache`
    );
    return {
      user,
      role: cached.role,
      displayName: cached.displayName,
      isInstructor: cached.isInstructor,
      permissions,
    };
  }

  timingMark("sessionPack:shellCache:miss");

  const profile = await timingAsync("sessionPack:profile", async () => {
    const result = await profileRepository.findProfileById(client, user.id);
    if (result.error) {
      throw new Error(result.error.message);
    }
    return result.data;
  });

  const profileRole = roleSchema.safeParse(profile?.role);
  const role: RoleValue =
    claimsRole ??
    (profileRole.success ? profileRole.data : null) ??
    roleFromAuthMetadata(user) ??
    ROLES.STUDENT;

  const isInstructor = profile?.is_instructor === true;

  let displayName = displayNameFromAuthUser(user, profile?.username ?? null);

  // Students without JWT full_name: one student_profiles read (skip for staff).
  if (
    role === ROLES.STUDENT &&
    !(
      typeof user.user_metadata?.full_name === "string" &&
      user.user_metadata.full_name.trim()
    )
  ) {
    displayName = await timingAsync("sessionPack:studentDisplayName", async () => {
      const { data } =
        await studentProfileRepository.findStudentProfileByUserId(
          client,
          user.id
        );
      if (data?.full_name?.trim()) {
        return data.full_name.trim();
      }
      return displayName;
    });
  }

  rememberUserRole(user.id, role);
  const permissions = await timingAsync("sessionPack:permissions", () =>
    getPermissionsForRoleCached(role)
  );

  setCachedSessionShell(user.id, {
    role,
    displayName,
    isInstructor,
    permissionKeys: [...permissions],
    cachedClaimsRole: claimsRole,
  });

  timingMark(
    `sessionPack:done role=${role} instructor=${isInstructor} perms=${permissions.size} source=db`
  );

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
