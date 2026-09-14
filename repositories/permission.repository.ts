import type { PermissionAccess, PermissionKey } from "@/lib/constants/permissions";
import type { RoleValue } from "@/lib/constants/roles";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export type PermissionRow = {
  key: string;
  label: string;
  feature_group: string;
  access: string;
  created_at: string;
};

export type RolePermissionRow = {
  role: string;
  permission_key: string;
};

export type UserPermissionEffect = "allow" | "deny";

export type UserPermissionRow = {
  user_id: string;
  permission_key: string;
  effect: UserPermissionEffect;
  granted_by: string | null;
  created_at: string;
};

export type UserPermissionUpsertInput = {
  permission_key: PermissionKey;
  effect: UserPermissionEffect;
  granted_by?: string | null;
};

export type PermissionUpsertInput = {
  key: PermissionKey;
  label: string;
  feature_group: string;
  access: PermissionAccess;
};

export async function listPermissions(client: Supabase) {
  return client
    .from("permissions")
    .select("key, label, feature_group, access, created_at")
    .order("feature_group", { ascending: true })
    .order("key", { ascending: true });
}

export async function listPermissionKeysByRole(
  client: Supabase,
  role: RoleValue
) {
  return client
    .from("role_permissions")
    .select("permission_key")
    .eq("role", role)
    .order("permission_key", { ascending: true });
}

export async function listRolePermissions(
  client: Supabase,
  role?: RoleValue
) {
  let query = client
    .from("role_permissions")
    .select("role, permission_key")
    .order("role", { ascending: true })
    .order("permission_key", { ascending: true });

  if (role) {
    query = query.eq("role", role);
  }

  return query;
}

export async function listUserPermissionRows(
  client: Supabase,
  userId: string
) {
  return client
    .from("user_permissions")
    .select("user_id, permission_key, effect, granted_by, created_at")
    .eq("user_id", userId)
    .order("permission_key", { ascending: true });
}

export async function upsertPermissions(
  client: Supabase,
  rows: PermissionUpsertInput[]
) {
  return client.from("permissions").upsert(
    rows.map((row) => ({
      key: row.key,
      label: row.label,
      feature_group: row.feature_group,
      access: row.access,
    })),
    { onConflict: "key" }
  );
}

/**
 * Replace all permission grants for a role.
 * Deletes existing rows, then inserts the provided keys.
 */
export async function replaceRolePermissions(
  client: Supabase,
  role: RoleValue,
  permissionKeys: PermissionKey[]
) {
  const uniqueKeys = [...new Set(permissionKeys)];

  if (uniqueKeys.length > 0) {
    const { data: existing, error: existingError } = await client
      .from("permissions")
      .select("key")
      .in("key", uniqueKeys);

    if (existingError) {
      return { data: null, error: existingError };
    }

    const existingKeys = new Set((existing ?? []).map((row) => row.key));
    const missing = uniqueKeys.filter((key) => !existingKeys.has(key));
    if (missing.length > 0) {
      throw new Error(`Unknown permission keys: ${missing.join(", ")}`);
    }
  }

  const { error: deleteError } = await client
    .from("role_permissions")
    .delete()
    .eq("role", role);

  if (deleteError) {
    return { data: null, error: deleteError };
  }

  if (uniqueKeys.length === 0) {
    return { data: [], error: null };
  }

  return client
    .from("role_permissions")
    .insert(
      uniqueKeys.map((permission_key) => ({
        role,
        permission_key,
      }))
    )
    .select("role, permission_key");
}

/**
 * Replace the full UBAC overlay for a user (hard-delete then insert snapshot).
 * At most one row per permission_key; last wins if duplicates are passed.
 */
export async function replaceUserPermissions(
  client: Supabase,
  userId: string,
  rows: UserPermissionUpsertInput[]
) {
  const byKey = new Map<PermissionKey, UserPermissionUpsertInput>();
  for (const row of rows) {
    byKey.set(row.permission_key, row);
  }
  const uniqueRows = [...byKey.values()];
  const uniqueKeys = uniqueRows.map((row) => row.permission_key);

  if (uniqueKeys.length > 0) {
    const { data: existing, error: existingError } = await client
      .from("permissions")
      .select("key")
      .in("key", uniqueKeys);

    if (existingError) {
      return { data: null, error: existingError };
    }

    const existingKeys = new Set((existing ?? []).map((row) => row.key));
    const missing = uniqueKeys.filter((key) => !existingKeys.has(key));
    if (missing.length > 0) {
      throw new Error(`Unknown permission keys: ${missing.join(", ")}`);
    }
  }

  const { error: deleteError } = await client
    .from("user_permissions")
    .delete()
    .eq("user_id", userId);

  if (deleteError) {
    return { data: null, error: deleteError };
  }

  if (uniqueRows.length === 0) {
    return { data: [], error: null };
  }

  return client
    .from("user_permissions")
    .insert(
      uniqueRows.map((row) => ({
        user_id: userId,
        permission_key: row.permission_key,
        effect: row.effect,
        granted_by: row.granted_by ?? null,
      }))
    )
    .select("user_id, permission_key, effect, granted_by, created_at");
}

/**
 * Hard-delete the entire UBAC overlay for a user.
 */
export async function deleteUserPermissions(
  client: Supabase,
  userId: string
) {
  return client.from("user_permissions").delete().eq("user_id", userId);
}

/**
 * Hard-delete specific overlay keys for a user.
 */
export async function deleteUserPermissionKeys(
  client: Supabase,
  userId: string,
  permissionKeys: readonly PermissionKey[]
) {
  const uniqueKeys = [...new Set(permissionKeys)];
  if (uniqueKeys.length === 0) {
    return { data: [], error: null };
  }

  return client
    .from("user_permissions")
    .delete()
    .eq("user_id", userId)
    .in("permission_key", uniqueKeys);
}

/**
 * Delete catalog rows whose keys are not in `keepKeys`.
 * Clears role_permissions and user_permissions that reference those keys first.
 */
export async function deletePermissionsNotInKeys(
  client: Supabase,
  keepKeys: readonly PermissionKey[]
) {
  const keepSet = new Set<string>(keepKeys);
  const { data: catalog, error: listError } = await listPermissions(client);

  if (listError) {
    return { data: null, error: listError };
  }

  const orphanKeys = (catalog ?? [])
    .map((row) => row.key)
    .filter((key) => !keepSet.has(key));

  if (orphanKeys.length === 0) {
    return { data: [], error: null };
  }

  const { error: roleGrantError } = await client
    .from("role_permissions")
    .delete()
    .in("permission_key", orphanKeys);

  if (roleGrantError) {
    return { data: null, error: roleGrantError };
  }

  const { error: userGrantError } = await client
    .from("user_permissions")
    .delete()
    .in("permission_key", orphanKeys);

  if (userGrantError) {
    return { data: null, error: userGrantError };
  }

  return client.from("permissions").delete().in("key", orphanKeys);
}
