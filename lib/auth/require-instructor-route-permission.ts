import { forbidden, redirect } from "next/navigation";
import { getRequiredViewPermissionForInstructorPath } from "@/lib/auth/instructor-route-permissions";
import { getSessionUser } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { ROUTES } from "@/lib/constants/routes";
import {
  getUserPermissionsCached,
  hasPermissionInSet,
} from "@/services/authorization.service";

/**
 * Deny instructor feature deep links when the matching view permission is missing.
 * Redirects to My workshops when `instructor_portal.workshops.view` is held;
 * otherwise `forbidden()`.
 */
export async function requireInstructorRoutePermission(
  pathname: string
): Promise<void> {
  const required = getRequiredViewPermissionForInstructorPath(pathname);
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

  if (
    hasPermissionInSet(permissions, PERMISSIONS.INSTRUCTOR_PORTAL_WORKSHOPS_VIEW)
  ) {
    redirect(ROUTES.INSTRUCTOR_WORKSHOPS);
  }

  forbidden();
}
