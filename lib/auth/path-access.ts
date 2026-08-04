import { isSharedManagerWorkshopPath } from "@/lib/auth/shared-manager-routes";
import { ROLES, type RoleValue } from "@/lib/constants/roles";
import { getPanelRootForRole, PANEL_ROOTS } from "@/lib/constants/routes";

export function isPanelPath(pathname: string): boolean {
  return PANEL_ROOTS.some(
    (root) => pathname === root || pathname.startsWith(`${root}/`)
  );
}

export function canAccessPath(pathname: string, role: RoleValue): boolean {
  if (isSharedManagerWorkshopPath(pathname)) {
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
