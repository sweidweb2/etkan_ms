import { canAccessPath } from "@/lib/auth/path-access";
import { PUBLIC_SIGNUP_ENABLED } from "@/lib/constants/auth";
import type { RoleValue } from "@/lib/constants/roles";
import {
  getDashboardRouteForRole,
  ROUTES,
} from "@/lib/constants/routes";

const AUTH_ONLY_PATHS = PUBLIC_SIGNUP_ENABLED
  ? ([ROUTES.LOGIN, ROUTES.SIGNUP] as const)
  : ([ROUTES.LOGIN] as const);

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
