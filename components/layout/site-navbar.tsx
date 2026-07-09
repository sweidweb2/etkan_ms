import { getSessionRole } from "@/lib/auth/session";
import { getDashboardRouteForRole } from "@/lib/constants/routes";
import { SiteNavbarClient } from "@/components/layout/site-navbar-client";

export async function SiteNavbar() {
  const role = await getSessionRole();
  const initialDashboardHref = role ? getDashboardRouteForRole(role) : null;

  return <SiteNavbarClient initialDashboardHref={initialDashboardHref} />;
}
