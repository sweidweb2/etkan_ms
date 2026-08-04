import { forbidden, redirect } from "next/navigation";
import { getRequiredViewPermissionForManagerPath } from "@/lib/auth/manager-route-permissions";
import { getSessionRole, getSessionUser } from "@/lib/auth/session";
import {
  getDashboardRouteForRole,
  ROUTES,
} from "@/lib/constants/routes";
import {
  getUserPermissionsCached,
  hasPermissionInSet,
} from "@/services/authorization.service";

/**
 * Deny manager deep links when the matching view permission is missing.
 * Redirects to the session role's dashboard when known; otherwise `forbidden()`.
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

  const role = await getSessionRole();
  if (role) {
    redirect(getDashboardRouteForRole(role));
  }

  forbidden();
}
