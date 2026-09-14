import {
  normalizeAllowKeys,
  stripRedundantAllows,
} from "@/lib/auth/permission-checks";
import { clearCachedSessionShell } from "@/lib/auth/session-shell-cache";
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
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export type UserAccessBreakdown = {
  userId: string;
  role: RoleValue;
  roleKeys: PermissionKey[];
  allowKeys: PermissionKey[];
};

export type ReplaceUserPermissionsResult =
  | { success: true; message: string; allowKeys: PermissionKey[] }
  | { success: false; error: string };

const MANAGER_ONLY_MESSAGE =
  "Only managers can manage user permission overlays.";

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
  const [roleKeys, allowKeys] = await Promise.all([
    loadRolePermissionKeys(adminClient, role),
    loadUserAllowKeys(adminClient, userId),
  ]);

  return {
    userId,
    role,
    roleKeys,
    allowKeys: stripRedundantAllows(allowKeys, roleKeys),
  };
}

export async function replaceUserPermissionsForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  userId: string,
  permissionKeys: readonly string[]
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

  for (const key of permissionKeys) {
    if (!isPermissionKey(key)) {
      return {
        success: false,
        error: `Unknown permission key: ${key}`,
      };
    }
  }

  const parsedRole = roleSchema.safeParse(profile.role);
  if (!parsedRole.success) {
    return { success: false, error: "User has an invalid role." };
  }

  const roleKeys = await loadRolePermissionKeys(adminClient, parsedRole.data);
  const nextAllowKeys = stripRedundantAllows(
    normalizeAllowKeys(permissionKeys),
    roleKeys
  );

  const previousAllowKeys = await loadUserAllowKeys(adminClient, userId);

  const { error } = await permissionRepository.replaceUserPermissions(
    adminClient,
    userId,
    nextAllowKeys.map((permission_key) => ({
      permission_key,
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
    old_data: { keys: previousAllowKeys },
    new_data: { keys: nextAllowKeys },
    metadata: {
      note: "User permission overlay replaced.",
      target_role: profile.role,
    },
  });

  clearCachedSessionShell(userId);

  return {
    success: true,
    message: "User permissions updated.",
    allowKeys: nextAllowKeys,
  };
}

/** On role change, hard-clear the user's private allow overlay. */
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
    old_data: { keys: previousAllowKeys },
    new_data: { keys: [] },
    metadata: {
      note: "Role changed; private permissions cleared.",
      previous_role: previousRole,
      new_role: newRole,
    },
  });

  clearCachedSessionShell(userId);
  return { success: true };
}
