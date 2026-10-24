import "server-only";

import {
  PERMISSION_DEFINITIONS,
  PERMISSION_FEATURES,
  PERMISSIONS,
  isPermissionKey,
  type PermissionDefinition,
  type PermissionKey,
} from "@/lib/constants/permissions";
import { ROLE_VALUES, type RoleValue } from "@/lib/constants/roles";
import { roleSchema } from "@/lib/validators/role";
import * as permissionRepository from "@/repositories/permission.repository";
import {
  assertPermission,
  getUnauthorizedError,
} from "@/services/auth/authorization.service";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export type RolePermissionsMap = Record<RoleValue, PermissionKey[]>;

export type UpdateRolePermissionsResult =
  | { success: true; message: string; keys: PermissionKey[] }
  | { success: false; error: string };

const RBAC_LOCKOUT_MESSAGE =
  "Cannot save: at least one role must keep the rbac.manage permission.";

function emptyRolePermissionsMap(): RolePermissionsMap {
  return Object.fromEntries(
    ROLE_VALUES.map((role) => [role, [] as PermissionKey[]])
  ) as RolePermissionsMap;
}

function normalizePermissionKeys(keys: readonly string[]): PermissionKey[] {
  const unique = new Set<PermissionKey>();
  for (const key of keys) {
    if (isPermissionKey(key)) {
      unique.add(key);
    }
  }
  return [...unique].sort();
}

/**
 * After replacing `role`'s grants with `nextKeys`, would any role still hold rbac.manage?
 */
export function wouldRetainRbacManage(
  currentByRole: RolePermissionsMap,
  role: RoleValue,
  nextKeys: readonly PermissionKey[]
): boolean {
  const nextSet = new Set(nextKeys);
  for (const candidate of ROLE_VALUES) {
    if (candidate === role) {
      if (nextSet.has(PERMISSIONS.RBAC_MANAGE)) {
        return true;
      }
      continue;
    }
    if (currentByRole[candidate]?.includes(PERMISSIONS.RBAC_MANAGE)) {
      return true;
    }
  }
  return false;
}

async function loadRolePermissionsMap(
  adminClient: Supabase
): Promise<RolePermissionsMap> {
  const map = emptyRolePermissionsMap();
  const { data, error } =
    await permissionRepository.listRolePermissions(adminClient);

  if (error) {
    throw new Error(error.message);
  }

  for (const row of data ?? []) {
    const parsedRole = roleSchema.safeParse(row.role);
    if (!parsedRole.success || !isPermissionKey(row.permission_key)) {
      continue;
    }
    map[parsedRole.data].push(row.permission_key);
  }

  for (const role of ROLE_VALUES) {
    map[role] = [...new Set(map[role])].sort();
  }

  return map;
}

export async function listRolesWithPermissionKeys(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<RolePermissionsMap> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.RBAC_MANAGE);
  return loadRolePermissionsMap(adminClient);
}

export async function getPermissionCatalogForManager(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<readonly PermissionDefinition[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.RBAC_MANAGE);
  return PERMISSION_DEFINITIONS;
}

export function getPermissionCatalogGrouped(): Array<{
  feature: (typeof PERMISSION_FEATURES)[number];
  definitions: PermissionDefinition[];
}> {
  return PERMISSION_FEATURES.map((feature) => ({
    feature,
    definitions: PERMISSION_DEFINITIONS.filter(
      (definition) => definition.feature === feature
    ),
  })).filter((group) => group.definitions.length > 0);
}

export async function updateRolePermissionsForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: { role: string; permissionKeys: readonly string[] }
): Promise<UpdateRolePermissionsResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.RBAC_MANAGE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsedRole = roleSchema.safeParse(input.role);
  if (!parsedRole.success) {
    return { success: false, error: "Invalid role." };
  }

  const role = parsedRole.data;
  const nextKeys = normalizePermissionKeys(input.permissionKeys);

  const currentByRole = await loadRolePermissionsMap(adminClient);
  if (!wouldRetainRbacManage(currentByRole, role, nextKeys)) {
    return { success: false, error: RBAC_LOCKOUT_MESSAGE };
  }

  const previousKeys = currentByRole[role];

  const { error } = await permissionRepository.replaceRolePermissions(
    adminClient,
    role,
    nextKeys
  );

  if (error) {
    return {
      success: false,
      error: error.message || "Unable to update role permissions.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "warning",
    table_name: "role_permissions",
    old_data: { permission_keys: previousKeys },
    new_data: { permission_keys: nextKeys },
    metadata: {
      role,
      note: "Role permissions updated.",
    },
  });

  return {
    success: true,
    message: `Permissions updated for ${role}.`,
    keys: nextKeys,
  };
}
