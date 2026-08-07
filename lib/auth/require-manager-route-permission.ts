import { forbidden, redirect } from "next/navigation";
import { getRequiredViewPermissionForManagerPath } from "@/lib/auth/manager-route-permissions";
import { getSessionPack } from "@/lib/auth/session";
import {
  getDashboardRouteForRole,
  ROUTES,
} from "@/lib/constants/routes";
import { hasPermissionInSet } from "@/services/authorization.service";

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

  const pack = await getSessionPack();
  if (!pack.user?.id) {
    redirect(ROUTES.LOGIN);
  }

  if (hasPermissionInSet(pack.permissions, required)) {
    return;
  }

  if (pack.role) {
    redirect(getDashboardRouteForRole(pack.role));
  }

  forbidden();
}
