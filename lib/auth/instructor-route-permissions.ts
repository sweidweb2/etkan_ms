import {
  PERMISSIONS,
  type PermissionKey,
} from "@/lib/constants/permissions";
import { ROUTES } from "@/lib/constants/routes";

type PrefixRule = {
  prefix: string;
  permission: PermissionKey;
};

const INSTRUCTOR_ROUTE_PREFIX_RULES_UNSORTED: readonly PrefixRule[] = [
  {
    prefix: ROUTES.INSTRUCTOR_DASHBOARD,
    permission: PERMISSIONS.INSTRUCTOR_PORTAL_VIEW,
  },
  {
    prefix: ROUTES.INSTRUCTOR_SCHEDULE,
    permission: PERMISSIONS.INSTRUCTOR_PORTAL_SCHEDULE_VIEW,
  },
  {
    prefix: ROUTES.INSTRUCTOR_WORKSHOPS,
    permission: PERMISSIONS.INSTRUCTOR_PORTAL_WORKSHOPS_VIEW,
  },
  {
    prefix: ROUTES.INSTRUCTOR_SESSIONS,
    permission: PERMISSIONS.INSTRUCTOR_PORTAL_SESSIONS_VIEW,
  },
  {
    prefix: ROUTES.INSTRUCTOR_CAPABILITIES,
    permission: PERMISSIONS.INSTRUCTOR_PORTAL_CAPABILITIES_VIEW,
  },
];

export const INSTRUCTOR_ROUTE_PREFIX_RULES: readonly PrefixRule[] = [
  ...INSTRUCTOR_ROUTE_PREFIX_RULES_UNSORTED,
].sort((a, b) => b.prefix.length - a.prefix.length);

function pathMatchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/**
 * Resolve the view permission required to open an instructor feature path.
 * Returns `null` when the path is not a known instructor feature route.
 */
export function getRequiredViewPermissionForInstructorPath(
  pathname: string
): PermissionKey | null {
  if (
    pathname !== ROUTES.INSTRUCTOR_ROOT &&
    !pathname.startsWith(`${ROUTES.INSTRUCTOR_ROOT}/`)
  ) {
    return null;
  }

  for (const rule of INSTRUCTOR_ROUTE_PREFIX_RULES) {
    if (pathMatchesPrefix(pathname, rule.prefix)) {
      return rule.permission;
    }
  }

  // Portal root / unknown nested → portal view
  return PERMISSIONS.INSTRUCTOR_PORTAL_VIEW;
}
