import { clearCachedSessionShell } from "@/lib/auth/session-shell-cache";
import { mergePermissionSets } from "@/lib/auth/permission-checks";
import {
  normalizeAllowKeys,
  overlaySnapshot,
  stripRedundantAllows,
  toOverlayAllowRows,
} from "@/lib/auth/user-permission-overlay";
import {
  isPermissionKey,
  PERMISSIONS,
  type PermissionKey,
} from "@/lib/constants/permissions";
import { ROLES, type RoleValue } from "@/lib/constants/roles";
import { roleSchema } from "@/lib/validators/role";
import * as permissionRepository from "@/repositories/permission.repository";
import * as profileRepository from "@/repositories/profile.repository";
import {
  getUnauthorizedError,
  UNAUTHORIZED_MESSAGE,
} from "@/services/auth/authorization.service";
import {
  loadRolePermissionKeys,
  loadUserAllowKeys,
} from "@/services/auth/permission-load";
import { wouldRetainManagerEffectiveRbacManage } from "@/services/auth/user-permissions-lockout";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export type OverlayRowInput = {
  permission_key: PermissionKey;
  effect: "allow";
};

export type UserAccessBreakdown = {
  userId: string;
  role: RoleValue;
  roleKeys: PermissionKey[];
  overlayRows: Array<{
    permission_key: PermissionKey;
    effect: "allow";
    granted_by: string | null;
    created_at: string;
  }>;
  effectiveKeys: PermissionKey[];
};

export type ReplaceUserPermissionsResult =
  | { success: true; message: string; rows: OverlayRowInput[] }
  | { success: false; error: string };

const MANAGER_ONLY_MESSAGE =
  "Only managers can manage user permission overlays.";
const RBAC_MANAGER_LOCKOUT_MESSAGE =
  "Cannot save: at least one manager must keep effective rbac.manage access.";

async function requireManagerActor(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<string | null> {
  if (!actorUserId) {
    return UNAUTHORIZED_MESSAGE;
  }

  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.RBAC_MANAGE
  );
  if (unauthorized) {
    return unauthorized;
  }

  const { data: profile, error } = await profileRepository.findRoleById(
    adminClient,
    actorUserId
  );
  if (error || !profile?.role) {
    return UNAUTHORIZED_MESSAGE;
  }

  const parsed = roleSchema.safeParse(profile.role);
  if (!parsed.success || parsed.data !== ROLES.MANAGER) {
    return MANAGER_ONLY_MESSAGE;
  }

  return null;
}

async function loadOverlayRows(
  adminClient: Supabase,
  userId: string
): Promise<UserAccessBreakdown["overlayRows"]> {
  const { data, error } = await permissionRepository.listUserPermissionRows(
    adminClient,
    userId
  );
  if (error || !data) {
    return [];
  }

  const rows: UserAccessBreakdown["overlayRows"] = [];
  for (const row of data) {
    if (row.effect !== "allow" || !isPermissionKey(row.permission_key)) {
      continue;
    }
    rows.push({
      permission_key: row.permission_key,
      effect: "allow",
      granted_by: row.granted_by,
      created_at: row.created_at,
    });
  }
  return rows.sort((a, b) =>
    a.permission_key.localeCompare(b.permission_key)
  );
}

export async function getUserAccessBreakdown(
  adminClient: Supabase,
  actorUserId: string | null,
  userId: string
): Promise<UserAccessBreakdown | { error: string }> {
  const denied = await requireManagerActor(adminClient, actorUserId);
  if (denied) {
    return { error: denied };
  }

  const { data: profile, error } = await profileRepository.findProfileById(
    adminClient,
    userId
  );
  if (error || !profile) {
    return { error: "User not found." };
  }

  const parsedRole = roleSchema.safeParse(profile.role);
  if (!parsedRole.success) {
    return { error: "User has an invalid role." };
  }

  const role = parsedRole.data;
  const [roleKeys, overlayRows] = await Promise.all([
    loadRolePermissionKeys(adminClient, role),
    loadOverlayRows(adminClient, userId),
  ]);
  const effectiveKeys = [
    ...mergePermissionSets({
      roleKeys,
      allows: overlayRows.map((row) => row.permission_key),
    }),
  ].sort();

  return {
    userId,
    role,
    roleKeys,
    overlayRows,
    effectiveKeys,
  };
}

export async function replaceUserPermissionsForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  userId: string,
  rows: readonly { permission_key: string; effect?: string }[]
): Promise<ReplaceUserPermissionsResult> {
  const denied = await requireManagerActor(adminClient, actorUserId);
  if (denied) {
    return { success: false, error: denied };
  }

  if (!userId) {
    return { success: false, error: "User not found." };
  }

  const { data: profile, error: profileError } =
    await profileRepository.findProfileById(adminClient, userId);
  if (profileError || !profile) {
    return { success: false, error: "User not found." };
  }

  for (const row of rows) {
    if (!isPermissionKey(row.permission_key)) {
      return {
        success: false,
        error: `Unknown permission key: ${row.permission_key}`,
      };
    }
    if (row.effect !== undefined && row.effect !== "allow") {
      return {
        success: false,
        error: "Only allow overlays are supported.",
      };
    }
  }

  const parsedRole = roleSchema.safeParse(profile.role);
  if (!parsedRole.success) {
    return { success: false, error: "User has an invalid role." };
  }

  const roleKeys = await loadRolePermissionKeys(adminClient, parsedRole.data);
  const nextAllowKeys = stripRedundantAllows(
    normalizeAllowKeys(rows),
    roleKeys
  );
  const nextRows = toOverlayAllowRows(nextAllowKeys);

  const previousAllowKeys = await loadUserAllowKeys(adminClient, userId);

  const retains = await wouldRetainManagerEffectiveRbacManage(
    adminClient,
    new Map([[userId, nextAllowKeys]])
  );
  if (!retains) {
    return { success: false, error: RBAC_MANAGER_LOCKOUT_MESSAGE };
  }

  const { error } = await permissionRepository.replaceUserPermissions(
    adminClient,
    userId,
    nextRows.map((row) => ({
      permission_key: row.permission_key,
      effect: "allow" as const,
      granted_by: actorUserId,
    }))
  );

  if (error) {
    return {
      success: false,
      error: error.message || "Unable to update user permissions.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "warning",
    table_name: "user_permissions",
    record_id: userId,
    old_data: overlaySnapshot(previousAllowKeys),
    new_data: overlaySnapshot(nextAllowKeys),
    metadata: {
      note: "User permission overlay replaced.",
      target_role: profile.role,
    },
  });

  clearCachedSessionShell(userId);

  return {
    success: true,
    message: "User permissions updated.",
    rows: nextRows,
  };
}

/**
 * On role change, hard-clear the user's private allow overlay.
 * Caller must enforce manager rbac.manage lockout before demoting.
 */
export async function clearUserOverlayAfterRoleChange(
  adminClient: Supabase,
  actor: AuditActor,
  input: {
    userId: string;
    previousRole: RoleValue;
    newRole: RoleValue;
  }
): Promise<{ success: true } | { success: false; error: string }> {
  const { userId, previousRole, newRole } = input;

  if (previousRole === newRole) {
    return { success: true };
  }

  const previousAllowKeys = await loadUserAllowKeys(adminClient, userId);
  if (previousAllowKeys.length === 0) {
    return { success: true };
  }

  const { error } = await permissionRepository.deleteUserPermissions(
    adminClient,
    userId
  );

  if (error) {
    return {
      success: false,
      error: error.message || "Unable to clear private permissions.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "warning",
    table_name: "user_permissions",
    record_id: userId,
    old_data: overlaySnapshot(previousAllowKeys),
    new_data: overlaySnapshot([]),
    metadata: {
      note: "Role changed; private permissions cleared.",
      previous_role: previousRole,
      new_role: newRole,
    },
  });

  clearCachedSessionShell(userId);
  return { success: true };
}

export { wouldRetainManagerEffectiveRbacManage } from "@/services/auth/user-permissions-lockout";
