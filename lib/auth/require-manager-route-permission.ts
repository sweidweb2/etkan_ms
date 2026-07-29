import { forbidden, redirect } from "next/navigation";
import { getRequiredViewPermissionForManagerPath } from "@/lib/auth/manager-route-permissions";
import { getSessionUser } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { ROUTES } from "@/lib/constants/routes";
import {
  getUserPermissionsCached,
  hasPermissionInSet,
} from "@/services/authorization.service";

/**
 * Deny manager deep links when the matching view permission is missing.
 * Redirects to the dashboard when `dashboard.view` is held; otherwise `forbidden()`.
 */
export async function requireManagerRoutePermission(
  pathname: string
): Promise<void> {
  const required = getRequiredViewPermissionForManagerPath(pathname);
  if (!required) {
    forbidden();
  }

  const user = await getSessionUser();
  if (!user?.id) {
    redirect(ROUTES.LOGIN);
  }

  const permissions = await getUserPermissionsCached(user.id);
  if (hasPermissionInSet(permissions, required)) {
    return;
  }

  if (hasPermissionInSet(permissions, PERMISSIONS.DASHBOARD_VIEW)) {
    redirect(ROUTES.MANAGER_DASHBOARD);
  }

  forbidden();
}
