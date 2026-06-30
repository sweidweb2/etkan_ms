import { ROLES, type RoleValue } from "@/lib/constants/roles";
import { ROUTES } from "@/lib/constants/routes";

export function isAdminPath(pathname: string): boolean {
  return (
    pathname === ROUTES.ADMIN_ROOT ||
    pathname.startsWith(`${ROUTES.ADMIN_ROOT}/`)
  );
}

export function canAccessPath(pathname: string, role: RoleValue): boolean {
  if (isAdminPath(pathname)) {
    return role === ROLES.ADMIN;
  }
  return true;
}
