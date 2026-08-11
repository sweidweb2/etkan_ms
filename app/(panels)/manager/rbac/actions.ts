"use server";

import { revalidatePath } from "next/cache";
import { getSessionAuditActor, getSessionUser } from "@/lib/auth/session";
import { clearCachedRolePermissionKeys } from "@/lib/auth/role-permissions-cache";
import { clearCachedSessionShell } from "@/lib/auth/session-shell-cache";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { ROUTES } from "@/lib/constants/routes";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUnauthorizedError } from "@/services/authorization.service";
import { updateRolePermissionsForManager } from "@/services/rbac.service";

export type UpdateRolePermissionsActionState = {
  success?: boolean;
  error?: string;
  message?: string;
};

export async function updateRolePermissionsAction(
  _prevState: UpdateRolePermissionsActionState,
  formData: FormData
): Promise<UpdateRolePermissionsActionState> {
  const user = await getSessionUser();
  const adminClient = createSupabaseAdminClient();
  const unauthorized = await getUnauthorizedError(
    adminClient,
    user?.id ?? null,
    PERMISSIONS.RBAC_MANAGE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const roleRaw = formData.get("role");
  const role = typeof roleRaw === "string" ? roleRaw : "";

  const permissionKeys = formData
    .getAll("permissionKeys")
    .filter((value): value is string => typeof value === "string");

  const actor = await getSessionAuditActor();
  const result = await updateRolePermissionsForManager(
    adminClient,
    user?.id ?? null,
    actor,
    { role, permissionKeys }
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  // Role grants affect many users — drop all shell + role-permission caches.
  clearCachedSessionShell();
  clearCachedRolePermissionKeys();
  revalidatePath(ROUTES.MANAGER_ROOT, "layout");
  return { success: true, message: result.message };
}
