import { redirect } from "next/navigation";
import { getSessionRole } from "@/lib/auth/session";
import { ROLES, type RoleValue } from "@/lib/constants/roles";
import { getDashboardRouteForRole } from "@/lib/constants/routes";

export async function requireRole(expected: RoleValue): Promise<RoleValue> {
  const role = await getSessionRole();

  if (!role) {
    redirect("/auth/login");
  }

  if (role !== expected) {
    redirect(getDashboardRouteForRole(role));
  }

  return role;
}

export async function requireAdmin(): Promise<RoleValue> {
  return requireRole(ROLES.ADMIN);
}
