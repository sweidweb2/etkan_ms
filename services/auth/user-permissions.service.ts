import { clearCachedSessionShell } from "@/lib/auth/session-shell-cache";
import { mergePermissionSets } from "@/lib/auth/permission-checks";
import {
  isPermissionKey,
  PERMISSIONS,
  type PermissionKey,
} from "@/lib/constants/permissions";
import { ROLES, type RoleValue } from "@/lib/constants/roles";
import { roleSchema } from "@/lib/validators/role";
import * as permissionRepository from "@/repositories/permission.repository";
import type { UserPermissionEffect } from "@/repositories/permission.repository";
import * as profileRepository from "@/repositories/profile.repository";
import {
  getUnauthorizedError,
  UNAUTHORIZED_MESSAGE,
} from "@/services/auth/authorization.service";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export type OverlayRowInput = {
  permission_key: PermissionKey;
  effect: UserPermissionEffect;
};

export type UserAccessBreakdown = {
  userId: string;
  role: RoleValue;
  roleKeys: PermissionKey[];
  overlayRows: Array<{
    permission_key: PermissionKey;
    effect: UserPermissionEffect;
    granted_by: string | null;
    created_at: string;
  }>;
  effectiveKeys: PermissionKey[];
};

export type ReplaceUserPermissionsResult =
  | { success: true; message: string; rows: OverlayRowInput[] }
  | { success: false; error: string };

export type ApplyRoleChangeOverlayResult =
  | { success: true; kept: OverlayRowInput[]; prunedKeys: PermissionKey[] }
  | {
      success: false;
      error: string;
      requiresKeepPrivateDecision?: boolean;
    };

const MANAGER_ONLY_MESSAGE =
  "Only managers can manage user permission overlays.";
const RBAC_MANAGER_LOCKOUT_MESSAGE =
  "Cannot save: at least one manager must keep effective rbac.manage access.";
export const KEEP_PRIVATE_PERMISSIONS_REQUIRED_MESSAGE =
  "Confirm whether to keep this user’s private permissions after the role change.";

function normalizeOverlayRows(
  rows: readonly { permission_key: string; effect: string }[]
): OverlayRowInput[] {
  const byKey = new Map<PermissionKey, OverlayRowInput>();
  for (const row of rows) {
    if (!isPermissionKey(row.permission_key)) {
      continue;
    }
    if (row.effect !== "allow" && row.effect !== "deny") {
      continue;
    }
    byKey.set(row.permission_key, {
      permission_key: row.permission_key,
      effect: row.effect,
    });
  }
  return [...byKey.values()].sort((a, b) =>
    a.permission_key.localeCompare(b.permission_key)
  );
}

function overlaySnapshot(rows: readonly OverlayRowInput[]) {
  return {
    rows: rows.map((row) => ({
      permission_key: row.permission_key,
      effect: row.effect,
    })),
  };
}

function splitOverlay(rows: readonly OverlayRowInput[]): {
  allows: PermissionKey[];
  denies: PermissionKey[];
} {
  const allows: PermissionKey[] = [];
  const denies: PermissionKey[] = [];
  for (const row of rows) {
    if (row.effect === "allow") {
      allows.push(row.permission_key);
    } else {
      denies.push(row.permission_key);
    }
  }
  return { allows, denies };
}

/**
 * Private overlays that still matter after a role change (dialog scope),
 * plus redundant rows that can be pruned without asking.
 */
export function classifyOverlayForRoleChange(
  overlayRows: readonly OverlayRowInput[],
  newRoleKeys: ReadonlySet<PermissionKey> | readonly PermissionKey[]
): {
  toAsk: OverlayRowInput[];
  toPrune: PermissionKey[];
} {
  const roleSet =
    newRoleKeys instanceof Set
      ? newRoleKeys
      : new Set<PermissionKey>(newRoleKeys);

  const toAsk: OverlayRowInput[] = [];
  const toPrune: PermissionKey[] = [];

  for (const row of overlayRows) {
    if (row.effect === "allow") {
      if (roleSet.has(row.permission_key)) {
        toPrune.push(row.permission_key);
      } else {
        toAsk.push(row);
      }
      continue;
    }

    // deny
    if (roleSet.has(row.permission_key)) {
      toAsk.push(row);
    } else {
      toPrune.push(row.permission_key);
    }
  }

  toAsk.sort((a, b) => a.permission_key.localeCompare(b.permission_key));
  toPrune.sort();
  return { toAsk, toPrune };
}

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

async function loadRoleKeys(
  adminClient: Supabase,
  role: RoleValue
): Promise<PermissionKey[]> {
  const { data, error } = await permissionRepository.listPermissionKeysByRole(
    adminClient,
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
    if (!isPermissionKey(row.permission_key)) {
      continue;
    }
    if (row.effect !== "allow" && row.effect !== "deny") {
      continue;
    }
    rows.push({
      permission_key: row.permission_key,
      effect: row.effect,
      granted_by: row.granted_by,
      created_at: row.created_at,
    });
  }
  return rows.sort((a, b) =>
    a.permission_key.localeCompare(b.permission_key)
  );
}

function effectiveFromParts(
  roleKeys: readonly PermissionKey[],
  overlayRows: readonly OverlayRowInput[]
): PermissionKey[] {
  const { allows, denies } = splitOverlay(overlayRows);
  return [
    ...mergePermissionSets({
      roleKeys,
      allows,
      denies,
    }),
  ].sort();
}

/**
 * True if at least one `manager`-role user would keep effective `rbac.manage`
 * after applying `nextOverlayByUserId` overrides (missing id → load from DB).
 */
export async function wouldRetainManagerEffectiveRbacManage(
  adminClient: Supabase,
  nextOverlayByUserId: ReadonlyMap<string, readonly OverlayRowInput[]> = new Map(),
  roleOverrideByUserId: ReadonlyMap<string, RoleValue> = new Map()
): Promise<boolean> {
  const managerRoleKeys = await loadRoleKeys(adminClient, ROLES.MANAGER);
  const { data: managers, error } = await profileRepository.listProfiles(
    adminClient,
    { roles: [ROLES.MANAGER] }
  );
  if (error) {
    throw new Error(error.message);
  }

  for (const manager of managers ?? []) {
    const role = roleOverrideByUserId.get(manager.id) ?? ROLES.MANAGER;
    if (role !== ROLES.MANAGER) {
      continue;
    }

    const roleKeys = managerRoleKeys;

    let overlay: OverlayRowInput[];
    if (nextOverlayByUserId.has(manager.id)) {
      overlay = [...(nextOverlayByUserId.get(manager.id) ?? [])];
    } else {
      overlay = (await loadOverlayRows(adminClient, manager.id)).map((row) => ({
        permission_key: row.permission_key,
        effect: row.effect,
      }));
    }

    const effective = effectiveFromParts(roleKeys, overlay);
    if (effective.includes(PERMISSIONS.RBAC_MANAGE)) {
      return true;
    }
  }

  return false;
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
  const roleKeys = await loadRoleKeys(adminClient, role);
  const overlayRows = await loadOverlayRows(adminClient, userId);
  const effectiveKeys = effectiveFromParts(
    roleKeys,
    overlayRows.map((row) => ({
      permission_key: row.permission_key,
      effect: row.effect,
    }))
  );

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
  rows: readonly { permission_key: string; effect: string }[]
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

  const nextRows = normalizeOverlayRows(rows);
  for (const row of rows) {
    if (!isPermissionKey(row.permission_key)) {
      return {
        success: false,
        error: `Unknown permission key: ${row.permission_key}`,
      };
    }
    if (row.effect !== "allow" && row.effect !== "deny") {
      return { success: false, error: "Invalid permission effect." };
    }
  }

  const previousRows = (await loadOverlayRows(adminClient, userId)).map(
    (row) => ({
      permission_key: row.permission_key,
      effect: row.effect,
    })
  );

  const overlayMap = new Map<string, readonly OverlayRowInput[]>([
    [userId, nextRows],
  ]);
  const retains = await wouldRetainManagerEffectiveRbacManage(
    adminClient,
    overlayMap
  );
  if (!retains) {
    return { success: false, error: RBAC_MANAGER_LOCKOUT_MESSAGE };
  }

  const { error } = await permissionRepository.replaceUserPermissions(
    adminClient,
    userId,
    nextRows.map((row) => ({
      permission_key: row.permission_key,
      effect: row.effect,
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
    old_data: overlaySnapshot(previousRows),
    new_data: overlaySnapshot(nextRows),
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
 * Plan overlay rows for a role change (no writes).
 * When `toAsk` is non-empty and `keepPrivatePermissions` is undefined,
 * returns `requiresKeepPrivateDecision`.
 */
export async function planOverlayAfterRoleChange(
  adminClient: Supabase,
  input: {
    userId: string;
    previousRole: RoleValue;
    newRole: RoleValue;
    keepPrivatePermissions?: boolean;
  }
): Promise<
  | {
      success: true;
      previousRows: OverlayRowInput[];
      nextRows: OverlayRowInput[];
      prunedKeys: PermissionKey[];
      keep: boolean;
    }
  | {
      success: false;
      error: string;
      requiresKeepPrivateDecision?: boolean;
    }
> {
  const { userId, previousRole, newRole, keepPrivatePermissions } = input;

  if (previousRole === newRole) {
    return {
      success: true,
      previousRows: [],
      nextRows: [],
      prunedKeys: [],
      keep: true,
    };
  }

  const previousRows = (await loadOverlayRows(adminClient, userId)).map(
    (row) => ({
      permission_key: row.permission_key,
      effect: row.effect,
    })
  );

  if (previousRows.length === 0) {
    return {
      success: true,
      previousRows: [],
      nextRows: [],
      prunedKeys: [],
      keep: true,
    };
  }

  const newRoleKeys = await loadRoleKeys(adminClient, newRole);
  const { toAsk, toPrune } = classifyOverlayForRoleChange(
    previousRows,
    newRoleKeys
  );

  if (toAsk.length > 0 && keepPrivatePermissions === undefined) {
    return {
      success: false,
      error: KEEP_PRIVATE_PERMISSIONS_REQUIRED_MESSAGE,
      requiresKeepPrivateDecision: true,
    };
  }

  const keep = keepPrivatePermissions === true;
  const nextRows = keep ? toAsk : [];
  const prunedKeys = [
    ...toPrune,
    ...(keep ? [] : toAsk.map((row) => row.permission_key)),
  ].sort();

  if (previousRole === ROLES.MANAGER && newRole !== ROLES.MANAGER) {
    const retains = await wouldRetainManagerEffectiveRbacManage(
      adminClient,
      new Map([[userId, nextRows]]),
      new Map([[userId, newRole]])
    );
    if (!retains) {
      return { success: false, error: RBAC_MANAGER_LOCKOUT_MESSAGE };
    }
  }

  if (newRole === ROLES.MANAGER) {
    const retains = await wouldRetainManagerEffectiveRbacManage(
      adminClient,
      new Map([[userId, nextRows]])
    );
    if (!retains) {
      return { success: false, error: RBAC_MANAGER_LOCKOUT_MESSAGE };
    }
  }

  return {
    success: true,
    previousRows,
    nextRows,
    prunedKeys,
    keep,
  };
}

/**
 * Commit a planned overlay after a successful role change.
 */
export async function commitOverlayAfterRoleChange(
  adminClient: Supabase,
  actor: AuditActor,
  input: {
    userId: string;
    previousRole: RoleValue;
    newRole: RoleValue;
    previousRows: OverlayRowInput[];
    nextRows: OverlayRowInput[];
    prunedKeys: PermissionKey[];
    keep: boolean;
  }
): Promise<{ success: true } | { success: false; error: string }> {
  const {
    userId,
    previousRole,
    newRole,
    previousRows,
    nextRows,
    prunedKeys,
    keep,
  } = input;

  if (
    previousRows.length === 0 &&
    nextRows.length === 0 &&
    prunedKeys.length === 0
  ) {
    return { success: true };
  }

  const { error } = await permissionRepository.replaceUserPermissions(
    adminClient,
    userId,
    nextRows.map((row) => ({
      ...row,
      granted_by: actor.userId,
    }))
  );

  if (error) {
    return {
      success: false,
      error: error.message || "Unable to update private permissions.",
    };
  }

  const hadAsk =
    previousRows.length !== nextRows.length ||
    previousRows.some(
      (row, i) =>
        row.permission_key !== nextRows[i]?.permission_key ||
        row.effect !== nextRows[i]?.effect
    );

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "warning",
    table_name: "user_permissions",
    record_id: userId,
    old_data: overlaySnapshot(previousRows),
    new_data: overlaySnapshot(nextRows),
    metadata: {
      note: keep
        ? "Role changed; private permissions kept (redundants pruned)."
        : hadAsk && !keep
          ? "Role changed; private permissions discarded (redundants pruned)."
          : "Role changed; redundant private permissions pruned.",
      previous_role: previousRole,
      new_role: newRole,
      keep_private: keep,
      pruned_keys: prunedKeys,
    },
  });

  clearCachedSessionShell(userId);
  return { success: true };
}

/** @deprecated Prefer planOverlayAfterRoleChange + commitOverlayAfterRoleChange */
export async function applyOverlayAfterRoleChange(
  adminClient: Supabase,
  actor: AuditActor,
  input: {
    userId: string;
    previousRole: RoleValue;
    newRole: RoleValue;
    keepPrivatePermissions?: boolean;
  }
): Promise<ApplyRoleChangeOverlayResult> {
  const plan = await planOverlayAfterRoleChange(adminClient, input);
  if (!plan.success) {
    return plan;
  }

  const committed = await commitOverlayAfterRoleChange(adminClient, actor, {
    userId: input.userId,
    previousRole: input.previousRole,
    newRole: input.newRole,
    previousRows: plan.previousRows,
    nextRows: plan.nextRows,
    prunedKeys: plan.prunedKeys,
    keep: plan.keep,
  });

  if (!committed.success) {
    return committed;
  }

  return {
    success: true,
    kept: plan.nextRows,
    prunedKeys: plan.prunedKeys,
  };
}
