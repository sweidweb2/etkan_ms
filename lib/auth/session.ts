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
import {
  isNavTimingEnabled,
  navTimingServerLog,
} from "@/lib/debug/nav-timing";
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

/** Request-scoped RSC timing bag for nav debug beacons. */
export const getNavRscTimingBag = cache((): Record<string, number> => ({}));

/**
 * Request-scoped who-am-I pack (user, role, display name, instructor, permissions).
 *
 * Every request: cheap getClaims identity.
 * Across navigations: process-TTL shell cache (role / displayName / instructor / perms)
 * keyed by userId — see `session-shell-cache.ts`.
 */
export const getSessionPack = cache(async (): Promise<SessionPack> => {
  const debugOn = isNavTimingEnabled();
  const bag = debugOn ? getNavRscTimingBag() : null;
  const packStart = debugOn ? performance.now() : 0;

  const client = await createSupabaseServerComponentClient();

  const claimsStart = debugOn ? performance.now() : 0;
  const identity = await getSessionAuthIdentity(client);
  if (bag) {
    bag.session_claims = performance.now() - claimsStart;
  }

  if (!identity) {
    if (bag) {
      bag.session_pack = performance.now() - packStart;
      bag.session_shell = 0;
    }
    return EMPTY_SESSION_PACK;
  }

  const { user, claimsRole } = identity;

  const cached = getCachedSessionShell(user.id);
  if (
    cached &&
    isSessionShellCompatibleWithClaims(cached, claimsRole)
  ) {
    rememberUserRole(user.id, cached.role);
    const permissions = permissionsFromKeys(cached.permissionKeys);
    if (bag) {
      bag.session_shell = 0;
      bag.session_shell_hit = 1;
      bag.session_pack = performance.now() - packStart;
      navTimingServerLog("rsc", "session_pack HIT", {
        claims: bag.session_claims ?? 0,
        pack: bag.session_pack,
      });
    }
    return {
      user,
      role: cached.role,
      displayName: cached.displayName,
      isInstructor: cached.isInstructor,
      permissions,
    };
  }

  if (bag) bag.session_shell_hit = 0;

  let profile: Awaited<
    ReturnType<typeof profileRepository.findProfileById>
  >["data"];
  let permissions: ReadonlySet<PermissionKey>;

  if (claimsRole) {
    // Profile and role grants are independent when JWT already carries role.
    const profileStart = debugOn ? performance.now() : 0;
    const permsStart = debugOn ? performance.now() : 0;
    const [profileResult, claimedPermissions] = await Promise.all([
      profileRepository.findProfileById(client, user.id),
      getPermissionsForRoleCached(claimsRole),
    ]);
    if (bag) {
      bag.session_profile = performance.now() - profileStart;
      bag.session_permissions = performance.now() - permsStart;
    }
    if (profileResult.error) {
      throw new Error(profileResult.error.message);
    }
    profile = profileResult.data;
    permissions = claimedPermissions;
  } else {
    const profileStart = debugOn ? performance.now() : 0;
    const profileResult = await profileRepository.findProfileById(
      client,
      user.id
    );
    if (bag) {
      bag.session_profile = performance.now() - profileStart;
    }
    if (profileResult.error) {
      throw new Error(profileResult.error.message);
    }
    profile = profileResult.data;
    permissions = EMPTY_PERMISSIONS;
  }

  const profileRole = roleSchema.safeParse(profile?.role);
  const role: RoleValue =
    claimsRole ??
    (profileRole.success ? profileRole.data : null) ??
    roleFromAuthMetadata(user) ??
    ROLES.STUDENT;

  // No JWT role: permissions waited on profile/metadata role resolution.
  if (!claimsRole) {
    const permsStart = debugOn ? performance.now() : 0;
    permissions = await getPermissionsForRoleCached(role);
    if (bag) {
      bag.session_permissions = performance.now() - permsStart;
    }
  }

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
    const studentStart = debugOn ? performance.now() : 0;
    const { data } =
      await studentProfileRepository.findStudentProfileByUserId(
        client,
        user.id
      );
    if (bag) {
      bag.session_student_profile = performance.now() - studentStart;
    }
    if (data?.full_name?.trim()) {
      displayName = data.full_name.trim();
    }
  }

  rememberUserRole(user.id, role);

  setCachedSessionShell(user.id, {
    role,
    displayName,
    isInstructor,
    permissionKeys: [...permissions],
    cachedClaimsRole: claimsRole,
  });

  if (bag) {
    bag.session_shell = 1;
    bag.session_pack = performance.now() - packStart;
    navTimingServerLog("rsc", "session_pack MISS", {
      claims: bag.session_claims ?? 0,
      profile: bag.session_profile ?? 0,
      permissions: bag.session_permissions ?? 0,
      pack: bag.session_pack,
    });
  }

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
