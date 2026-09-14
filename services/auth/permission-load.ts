import { mergePermissionSets } from "@/lib/auth/permission-checks";
import {
  isPermissionKey,
  type PermissionKey,
} from "@/lib/constants/permissions";
import type { RoleValue } from "@/lib/constants/roles";
import * as permissionRepository from "@/repositories/permission.repository";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const EMPTY_PERMISSIONS: ReadonlySet<PermissionKey> = new Set();

export async function loadRolePermissionKeys(
  client: Supabase,
  role: RoleValue
): Promise<PermissionKey[]> {
  const { data, error } = await permissionRepository.listPermissionKeysByRole(
    client,
    role
  );
  if (error || !data) {
    return [];
  }

  const keys: PermissionKey[] = [];
  for (const row of data) {
    if (isPermissionKey(row.permission_key)) {
      keys.push(row.permission_key);
    }
  }
  return [...new Set(keys)].sort();
}

/** Load UBAC allow keys for a user. */
export async function loadUserAllowKeys(
  client: Supabase,
  userId: string
): Promise<PermissionKey[]> {
  if (!userId) {
    return [];
  }

  const { data, error } = await permissionRepository.listUserPermissionRows(
    client,
    userId
  );
  if (error || !data) {
    return [];
  }

  const keys: PermissionKey[] = [];
  for (const row of data) {
    if (isPermissionKey(row.permission_key)) {
      keys.push(row.permission_key);
    }
  }
  return [...new Set(keys)].sort();
}

export async function loadEffectivePermissionKeys(
  client: Supabase,
  userId: string,
  role: RoleValue
): Promise<ReadonlySet<PermissionKey>> {
  const [roleKeys, allows] = await Promise.all([
    loadRolePermissionKeys(client, role),
    loadUserAllowKeys(client, userId),
  ]);

  if (roleKeys.length === 0 && allows.length === 0) {
    return EMPTY_PERMISSIONS;
  }

  return mergePermissionSets({
    roleKeys,
    allows,
  });
}
