import { canAccessPath } from "@/lib/auth/path-access";
import type { RoleValue } from "@/lib/constants/roles";
import {
  getDashboardRouteForRole,
  ROUTES,
} from "@/lib/constants/routes";

const AUTH_ONLY_PATHS = [ROUTES.LOGIN, ROUTES.SIGNUP, ROUTES.REGISTER] as const;

export function getSafeRedirectPath(path: string | null | undefined): string {
  if (path && path.startsWith("/") && !path.startsWith("//")) {
    return path;
  }
  return ROUTES.HOME;
}

export function getPostLoginRedirect(
  role: RoleValue,
  nextPath?: string | null
): string {
  const safeNext = nextPath ? getSafeRedirectPath(nextPath) : null;

  if (
    safeNext &&
    !AUTH_ONLY_PATHS.includes(safeNext as (typeof AUTH_ONLY_PATHS)[number]) &&
    canAccessPath(safeNext, role)
  ) {
    return safeNext;
  }

  return getDashboardRouteForRole(role);
}
