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

export const MANAGER_PANEL_NAV: PanelNavItem[] = [
  {
    title: "Dashboard",
    href: ROUTES.MANAGER_DASHBOARD,
    icon: "layout-dashboard",
  },
  {
    title: "Manage users",
    href: ROUTES.MANAGER_USERS,
    icon: "users",
  },
  {
    title: "Manage students",
    href: ROUTES.MANAGER_STUDENTS,
    icon: "book-open",
  },
  {
    title: "Manage subjects",
    href: ROUTES.MANAGER_SUBJECTS,
    icon: "library",
  },
  {
    title: "Accounting",
    href: ROUTES.MANAGER_ACCOUNTING,
    icon: "calculator",
  },
  {
    title: "Schedule",
    href: ROUTES.MANAGER_SCHEDULE,
    icon: "calendar-days",
  },
  {
    title: "Notifications",
    href: ROUTES.MANAGER_NOTIFICATIONS,
    icon: "bell",
  },
  {
    title: "Manage classes",
    href: ROUTES.MANAGER_CLASSES,
    icon: "school",
  },
  {
    title: "Manage equipments",
    href: ROUTES.MANAGER_EQUIPMENTS,
    icon: "package",
  },
  {
    title: "Manage relationships",
    href: ROUTES.MANAGER_RELATIONSHIPS,
    icon: "users",
  },
  {
    title: "Manage phases",
    href: ROUTES.MANAGER_PHASES,
    icon: "layers",
  },
  {
    title: "Reports",
    href: ROUTES.MANAGER_REPORTS,
    icon: "reports",
  },
  {
    title: "Analytics",
    href: ROUTES.MANAGER_ANALYTICS,
    icon: "analytics",
  },
  {
    title: "Backup",
    href: ROUTES.MANAGER_BACKUP,
    icon: "backup",
  },
  {
    title: "Settings",
    href: ROUTES.MANAGER_SETTINGS,
    icon: "settings",
  },
];

export const CEO_PANEL_NAV = dashboardNav(ROUTES.CEO_DASHBOARD);
export const TEACHER_PANEL_NAV = dashboardNav(ROUTES.TEACHER_DASHBOARD);
export const STUDENT_PANEL_NAV = dashboardNav(ROUTES.STUDENT_DASHBOARD);
