import { ROUTES } from "@/lib/constants/routes";
import type { PanelNavItem } from "@/types/panel";

function dashboardNav(href: string): PanelNavItem[] {
  return [
    {
      title: "Dashboard",
      href,
      icon: "layout-dashboard",
    },
  ];
}

export const ADMIN_PANEL_NAV = dashboardNav(ROUTES.ADMIN_DASHBOARD);
export const MANAGER_PANEL_NAV = dashboardNav(ROUTES.MANAGER_DASHBOARD);
export const CEO_PANEL_NAV = dashboardNav(ROUTES.CEO_DASHBOARD);
export const TEACHER_PANEL_NAV = dashboardNav(ROUTES.TEACHER_DASHBOARD);
export const STUDENT_PANEL_NAV = dashboardNav(ROUTES.STUDENT_DASHBOARD);
