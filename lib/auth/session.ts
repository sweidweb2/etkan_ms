import "server-only";

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
  getOrCreateSessionShellInflight,
  isSessionShellCompatibleWithClaims,
  setCachedSessionShell,
  type SessionShellPayload,
} from "@/lib/auth/session-shell-cache";
import { canAccessManageWorkshops } from "@/lib/auth/workshop-attribute-access";
import {
  isNavTimingEnabled,
  navTimingServerLog,
} from "@/lib/debug/nav-timing";
import { roleSchema } from "@/lib/validators/role";
import * as profileRepository from "@/repositories/profile.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import { getSessionAuthIdentity } from "@/services/auth/auth.service";
import {
  getEffectivePermissionsForUserCached,
  rememberUserRole,
} from "@/services/auth/authorization.service";
import type { AuditActor } from "@/services/ops/audit-log.service";
import { roleFromAuthMetadata } from "@/services/auth/role.service";
import { displayNameFromAuthUser } from "@/services/auth/user-display.service";

const EMPTY_PERMISSIONS: ReadonlySet<PermissionKey> = new Set();

export type SessionPack = {
  user: User | null;
  role: RoleValue | null;
  displayName: string;
  avatarUrl: string | null;
  isInstructor: boolean;
  permissions: ReadonlySet<PermissionKey>;
};

const EMPTY_SESSION_PACK: SessionPack = {
  user: null,
  role: null,
  displayName: "User",
  avatarUrl: null,
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

async function timeBag<T>(
  bag: Record<string, number> | null,
  key: string,
  fn: () => Promise<T>
): Promise<T> {
  if (!bag) {
    return fn();
  }
  const start = performance.now();
  try {
    return await fn();
  } finally {
    bag[key] = performance.now() - start;
  }
}

/** Request-scoped RSC timing bag for nav debug beacons. */
export const getNavRscTimingBag = cache((): Record<string, number> => ({}));

type SessionClient = Awaited<
  ReturnType<typeof createSupabaseServerComponentClient>
>;

async function buildSessionShell(
  client: SessionClient,
  user: User,
  claimsRole: RoleValue | null,
  bag: Record<string, number> | null
): Promise<SessionShellPayload> {
  let profile: Awaited<
    ReturnType<typeof profileRepository.findProfileById>
  >["data"];
  let permissions: ReadonlySet<PermissionKey>;

  if (claimsRole) {
    // Profile and effective grants are independent when JWT already carries role.
    // Effective = role_permissions only (see getEffectivePermissionsForUserCached).
    const [profileResult, claimedPermissions] = await Promise.all([
      timeBag(bag, "session_profile", () =>
        profileRepository.findProfileById(client, user.id)
      ),
      timeBag(bag, "session_permissions", () =>
        getEffectivePermissionsForUserCached(user.id, claimsRole)
      ),
    ]);
    if (profileResult.error) {
      throw new Error(profileResult.error.message);
    }
    profile = profileResult.data;
    permissions = claimedPermissions;
  } else {
    const profileResult = await timeBag(bag, "session_profile", () =>
      profileRepository.findProfileById(client, user.id)
    );
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
    permissions = await timeBag(bag, "session_permissions", () =>
      getEffectivePermissionsForUserCached(user.id, role)
    );
  }

  const isInstructor = profile?.is_instructor === true;

  let displayName = displayNameFromAuthUser(user, profile?.full_name ?? null);

  // Students without JWT full_name: one student_profiles read (skip for staff).
  if (
    role === ROLES.STUDENT &&
    !(
      typeof user.user_metadata?.full_name === "string" &&
      user.user_metadata.full_name.trim()
    )
  ) {
    const { data } = await timeBag(bag, "session_student_profile", () =>
      studentProfileRepository.findStudentProfileByUserId(client, user.id)
    );
    if (data?.full_name?.trim()) {
      displayName = data.full_name.trim();
    }
  }

  const payload: SessionShellPayload = {
    role,
    displayName,
    avatarUrl: profile?.avatar_url ?? null,
    isInstructor,
    permissionKeys: [...permissions],
    cachedClaimsRole: claimsRole,
  };
  setCachedSessionShell(user.id, payload);
  return payload;
}

function packFromShell(
  user: User,
  shell: SessionShellPayload
): SessionPack {
  rememberUserRole(user.id, shell.role);
  return {
    user,
    role: shell.role,
    displayName: shell.displayName,
    avatarUrl: shell.avatarUrl ?? null,
    isInstructor: shell.isInstructor,
    permissions: permissionsFromKeys(shell.permissionKeys),
  };
}

/**
 * Who-am-I pack (user, role, display name, instructor, permissions).
 *
 * Every call: cheap getClaims identity.
 * Across requests: process-TTL shell + in-flight singleflight on MISS.
 * Prefer `getSessionPack` in RSC (request-scoped React cache).
 */
export async function loadSessionPack(): Promise<SessionPack> {
  const debugOn = isNavTimingEnabled();
  const bag = debugOn ? getNavRscTimingBag() : null;
  const packStart = debugOn ? performance.now() : 0;

  const client = await timeBag(bag, "session_client", () =>
    createSupabaseServerComponentClient()
  );

  const identity = await timeBag(bag, "session_claims", () =>
    getSessionAuthIdentity(client)
  );

  if (!identity) {
    if (bag) {
      bag.session_pack = performance.now() - packStart;
      bag.session_shell = 0;
    }
    return EMPTY_SESSION_PACK;
  }

  const { user, claimsRole } = identity;

  const cached = getCachedSessionShell(user.id);
  if (cached && isSessionShellCompatibleWithClaims(cached, claimsRole)) {
    const pack = packFromShell(user, cached);
    if (bag) {
      bag.session_shell = 0;
      bag.session_shell_hit = 1;
      bag.session_pack = performance.now() - packStart;
      navTimingServerLog("rsc", "session_pack HIT", {
        client: bag.session_client ?? 0,
        claims: bag.session_claims ?? 0,
        pack: bag.session_pack,
      });
    }
    return pack;
  }

  if (bag) bag.session_shell_hit = 0;

  const waitStart = debugOn ? performance.now() : 0;
  const { payload, shared } = await getOrCreateSessionShellInflight(
    user.id,
    () => buildSessionShell(client, user, claimsRole, bag)
  );
  if (bag && shared) {
    bag.session_wait = performance.now() - waitStart;
  }

  const shell =
    isSessionShellCompatibleWithClaims(payload, claimsRole)
      ? payload
      : await buildSessionShell(client, user, claimsRole, bag);

  const pack = packFromShell(user, shell);

  if (bag) {
    bag.session_pack = performance.now() - packStart;
    if (shared) {
      bag.session_shell = 0;
      navTimingServerLog("rsc", "session_pack WAIT", {
        client: bag.session_client ?? 0,
        claims: bag.session_claims ?? 0,
        wait: bag.session_wait ?? 0,
        pack: bag.session_pack,
      });
    } else {
      bag.session_shell = 1;
      navTimingServerLog("rsc", "session_pack MISS", {
        client: bag.session_client ?? 0,
        claims: bag.session_claims ?? 0,
        profile: bag.session_profile ?? 0,
        permissions: bag.session_permissions ?? 0,
        pack: bag.session_pack,
      });
    }
  }

  return pack;
}

/** Request-scoped who-am-I pack. Cross-request MISS coalescing is in loadSessionPack. */
export const getSessionPack = cache(loadSessionPack);

export async function getSessionUser() {
  return (await getSessionPack()).user;
}

export async function getSessionRole(): Promise<RoleValue | null> {
  return (await getSessionPack()).role;
}

export async function getSessionIsInstructor(): Promise<boolean> {
  return (await getSessionPack()).isInstructor;
}

export async function getSessionCanAccessManageWorkshops(): Promise<boolean> {
  const pack = await getSessionPack();
  return canAccessManageWorkshops({ isInstructor: pack.isInstructor });
}

export async function getSessionDisplayName(): Promise<string> {
  return (await getSessionPack()).displayName;
}

export async function getSessionAuditActor(): Promise<AuditActor> {
  const pack = await getSessionPack();

  return {
    userId: pack.user?.id ?? null,
    userLabel: pack.displayName || "System",
    role: pack.role,
  };
}
