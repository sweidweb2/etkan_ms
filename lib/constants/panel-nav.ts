import { ROUTES } from "@/lib/constants/routes";
import type { PanelNavItem, PanelNavigation } from "@/types/panel";

function dashboardNavigation(href: string): PanelNavigation {
  return {
    items: [
      {
        title: "Dashboard",
        href,
        icon: "layout-dashboard",
      },
    ],
  };
}

export const ADMIN_PANEL_NAV = dashboardNavigation(ROUTES.ADMIN_DASHBOARD).items!;

export const MANAGER_PANEL_NAVIGATION: PanelNavigation = {
  items: [
    {
      title: "Dashboard",
      href: ROUTES.MANAGER_DASHBOARD,
      icon: "layout-dashboard",
    },
  ],
  groups: [
    {
      id: "people",
      label: "People",
      defaultOpen: true,
      items: [
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
          title: "Manage relationships",
          href: ROUTES.MANAGER_RELATIONSHIPS,
          icon: "users",
        },
      ],
    },
    {
      id: "academics",
      label: "Academics",
      defaultOpen: true,
      items: [
        {
          title: "Manage subjects",
          href: ROUTES.MANAGER_SUBJECTS,
          icon: "library",
        },
        {
          title: "Manage classes",
          href: ROUTES.MANAGER_CLASSES,
          icon: "school",
        },
        {
          title: "Manage phases",
          href: ROUTES.MANAGER_PHASES,
          icon: "layers",
        },
        {
          title: "Manage equipments",
          href: ROUTES.MANAGER_EQUIPMENTS,
          icon: "package",
        },
      ],
    },
    {
      id: "operations",
      label: "Operations",
      defaultOpen: true,
      items: [
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
      ],
    },
    {
      id: "system",
      label: "System",
      defaultOpen: true,
      items: [
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
      ],
    },
  ],
};

/** @deprecated Use `MANAGER_PANEL_NAVIGATION` — kept for flatten/search helpers. */
export const MANAGER_PANEL_NAV: PanelNavItem[] = [
  ...(MANAGER_PANEL_NAVIGATION.items ?? []),
  ...(MANAGER_PANEL_NAVIGATION.groups?.flatMap((group) => group.items) ?? []),
];

export const CEO_PANEL_NAV = dashboardNavigation(ROUTES.CEO_DASHBOARD).items!;
export const TEACHER_PANEL_NAV = dashboardNavigation(ROUTES.TEACHER_DASHBOARD).items!;
export const STUDENT_PANEL_NAV = dashboardNavigation(ROUTES.STUDENT_DASHBOARD).items!;

export const CEO_PANEL_NAVIGATION = dashboardNavigation(ROUTES.CEO_DASHBOARD);
export const TEACHER_PANEL_NAVIGATION = dashboardNavigation(
  ROUTES.TEACHER_DASHBOARD
);
export const STUDENT_PANEL_NAVIGATION = dashboardNavigation(
  ROUTES.STUDENT_DASHBOARD
);
export const ADMIN_PANEL_NAVIGATION = dashboardNavigation(ROUTES.ADMIN_DASHBOARD);
