import { isSharedManagerPath } from "@/lib/auth/shared-manager-routes";
import { ROLES, type RoleValue } from "@/lib/constants/roles";
import {
  getPanelRootForRole,
  PANEL_ROOTS,
  ROUTES,
} from "@/lib/constants/routes";

export function isPanelPath(pathname: string): boolean {
  return PANEL_ROOTS.some(
    (root) => pathname === root || pathname.startsWith(`${root}/`)
  );
}

/** Public Life section — admin-only (middleware + post-login `next`). */
export function isLifePath(pathname: string): boolean {
  return pathname === ROUTES.LIFE || pathname.startsWith(`${ROUTES.LIFE}/`);
}

export function canAccessPath(pathname: string, role: RoleValue): boolean {
  if (isLifePath(pathname)) {
    return role === ROLES.ADMIN;
  }

  if (isSharedManagerPath(pathname)) {
    return true;
  }

  const allowedRoot = getPanelRootForRole(role);

  for (const root of PANEL_ROOTS) {
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
