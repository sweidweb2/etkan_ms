import { mergePermissionSets } from "@/lib/auth/permission-checks";
import {
  isPermissionKey,
  PERMISSIONS,
  type PermissionKey,
} from "@/lib/constants/permissions";
import { ROLES, type RoleValue } from "@/lib/constants/roles";
import * as permissionRepository from "@/repositories/permission.repository";
import * as profileRepository from "@/repositories/profile.repository";
import { loadRolePermissionKeys } from "@/services/auth/permission-load";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

/**
 * True if at least one `manager`-role user would keep effective `rbac.manage`
 * after applying `nextAllowKeysByUserId` overrides (missing id → load from DB).
 */
export async function wouldRetainManagerEffectiveRbacManage(
  adminClient: Supabase,
  nextAllowKeysByUserId: ReadonlyMap<string, readonly PermissionKey[]> = new Map(),
  roleOverrideByUserId: ReadonlyMap<string, RoleValue> = new Map()
): Promise<boolean> {
  const managerRoleKeys = await loadRolePermissionKeys(
    adminClient,
    ROLES.MANAGER
  );
  const { data: managers, error } = await profileRepository.listProfiles(
    adminClient,
    { roles: [ROLES.MANAGER] }
  );
  if (error) {
    throw new Error(error.message);
  }

  const managerIds = (managers ?? []).map((manager) => manager.id);
  if (managerIds.length === 0) {
    return false;
  }

  const idsNeedingFetch = managerIds.filter(
    (id) => !nextAllowKeysByUserId.has(id)
  );

  const overlayByUserId = new Map<string, PermissionKey[]>();
  if (idsNeedingFetch.length > 0) {
    const { data: rows, error: overlayError } =
      await permissionRepository.listUserPermissionRowsForUsers(
        adminClient,
        idsNeedingFetch
      );
    if (overlayError) {
      throw new Error(overlayError.message);
    }

    for (const row of rows ?? []) {
      if (row.effect !== "allow" || !isPermissionKey(row.permission_key)) {
        continue;
      }
      const current = overlayByUserId.get(row.user_id) ?? [];
      current.push(row.permission_key);
      overlayByUserId.set(row.user_id, current);
    }
  }

  for (const manager of managers ?? []) {
    const role = roleOverrideByUserId.get(manager.id) ?? ROLES.MANAGER;
    if (role !== ROLES.MANAGER) {
      continue;
    }

    const allows = nextAllowKeysByUserId.has(manager.id)
      ? [...(nextAllowKeysByUserId.get(manager.id) ?? [])]
      : (overlayByUserId.get(manager.id) ?? []);

    const effective = mergePermissionSets({
      roleKeys: managerRoleKeys,
      allows,
    });
    if (effective.has(PERMISSIONS.RBAC_MANAGE)) {
      return true;
    }
  }

  return false;
}
