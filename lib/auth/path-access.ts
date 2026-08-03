import { ROUTES } from "@/lib/constants/routes";
import { ROLES, type RoleValue } from "@/lib/constants/roles";
import { getPanelRootForRole, PANEL_ROOTS } from "@/lib/constants/routes";

export function isPanelPath(pathname: string): boolean {
  return PANEL_ROOTS.some(
    (root) => pathname === root || pathname.startsWith(`${root}/`)
  );
}

/** Instructor feature routes under `/instructor` (sidebar section, not a role panel). */
export function isInstructorFeaturePath(pathname: string): boolean {
  return (
    pathname === ROUTES.INSTRUCTOR_ROOT ||
    pathname.startsWith(`${ROUTES.INSTRUCTOR_ROOT}/`)
  );
}

/** @deprecated Use `isInstructorFeaturePath`. */
export const isInstructorPortalPath = isInstructorFeaturePath;

export function canAccessPath(
  pathname: string,
  role: RoleValue,
  options?: { isInstructor?: boolean }
): boolean {
  if (isInstructorFeaturePath(pathname)) {
    return options?.isInstructor === true;
  }

  const allowedRoot = getPanelRootForRole(role);

  for (const root of PANEL_ROOTS) {
    if (root === ROUTES.INSTRUCTOR_ROOT) {
      continue;
    }

    const isThisPanel =
      pathname === root || pathname.startsWith(`${root}/`);

    if (isThisPanel) {
      return root === allowedRoot;
    }
  }

  return true;
}

export function isAdminPath(pathname: string): boolean {
  return (
    pathname === getPanelRootForRole(ROLES.ADMIN) ||
    pathname.startsWith(`${getPanelRootForRole(ROLES.ADMIN)}/`)
  );
}
