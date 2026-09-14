import {
  normalizeAllowKeys,
  stripRedundantAllows,
} from "@/lib/auth/permission-checks";
import { clearCachedSessionShell } from "@/lib/auth/session-shell-cache";
import { WORKSHOP_ATTRIBUTE_READONLY_PERMISSIONS } from "@/lib/auth/workshop-attribute-access";
import { roleSchema } from "@/lib/validators/role";
import * as permissionRepository from "@/repositories/permission.repository";
import * as profileRepository from "@/repositories/profile.repository";
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

export type SyncWorkshopAttributeAccessResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Keep personal readonly workshop grants in sync with instructor/mentor flags.
 * - Gaining either flag: merge view-only keys into the user's UBAC overlay.
 * - Losing both flags: drop those attribute keys from the overlay.
 */
export async function syncWorkshopAttributeAccessOverlay(
  adminClient: Supabase,
  actor: AuditActor | null,
  input: {
    userId: string;
    previousIsInstructor: boolean;
    previousIsMentor: boolean;
    nextIsInstructor: boolean;
    nextIsMentor: boolean;
  }
): Promise<SyncWorkshopAttributeAccessResult> {
  const {
    userId,
    previousIsInstructor,
    previousIsMentor,
    nextIsInstructor,
    nextIsMentor,
  } = input;

  const hadAccess = previousIsInstructor || previousIsMentor;
  const hasAccess = nextIsInstructor || nextIsMentor;

  if (hadAccess === hasAccess) {
    return { success: true };
  }

  const { data: profile, error: profileError } =
    await profileRepository.findProfileById(adminClient, userId);
  if (profileError || !profile) {
    return { success: false, error: "User not found." };
  }

  const parsedRole = roleSchema.safeParse(profile.role);
  if (!parsedRole.success) {
    return { success: false, error: "User has an invalid role." };
  }

  const [roleKeys, previousAllowKeys] = await Promise.all([
    loadRolePermissionKeys(adminClient, parsedRole.data),
    loadUserAllowKeys(adminClient, userId),
  ]);

  let nextAllowKeys = previousAllowKeys;

  if (hasAccess) {
    nextAllowKeys = stripRedundantAllows(
      normalizeAllowKeys([
        ...previousAllowKeys,
        ...WORKSHOP_ATTRIBUTE_READONLY_PERMISSIONS,
      ]),
      roleKeys
    );
  } else {
    const revoke = new Set<string>(WORKSHOP_ATTRIBUTE_READONLY_PERMISSIONS);
    nextAllowKeys = previousAllowKeys.filter((key) => !revoke.has(key));
  }

  const previousSorted = [...previousAllowKeys].sort().join("\0");
  const nextSorted = [...nextAllowKeys].sort().join("\0");
  if (previousSorted === nextSorted) {
    return { success: true };
  }

  const { error } = await permissionRepository.replaceUserPermissions(
    adminClient,
    userId,
    nextAllowKeys.map((permission_key) => ({
      permission_key,
      granted_by: actor?.userId ?? null,
    }))
  );

  if (error) {
    return {
      success: false,
      error: error.message || "Unable to sync workshop attribute permissions.",
    };
  }

  if (actor) {
    await recordManagerAuditLog(adminClient, actor, {
      action: "update",
      severity: "info",
      table_name: "user_permissions",
      record_id: userId,
      old_data: { keys: previousAllowKeys },
      new_data: { keys: nextAllowKeys },
      metadata: {
        note: hasAccess
          ? "Workshop readonly overlay granted for instructor/mentor attribute."
          : "Workshop readonly overlay revoked after instructor/mentor cleared.",
        is_instructor: nextIsInstructor,
        is_mentor: nextIsMentor,
      },
    });
  }

  clearCachedSessionShell(userId);
  return { success: true };
}
