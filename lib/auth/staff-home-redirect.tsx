import { redirect } from "next/navigation";
import { getDashboardRouteForRole } from "@/lib/constants/routes";
import type { RoleValue } from "@/lib/constants/roles";

/**
 * Staff roles without a dedicated home surface land on their
 * configured dashboard (usually an allowed `/manager/*` page).
 */
export function createStaffHomeRedirect(role: RoleValue) {
  return function StaffHomeRedirectPage() {
    redirect(getDashboardRouteForRole(role));
  };
}
