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
          title: "Manage semesters",
          href: ROUTES.MANAGER_SEMESTERS,
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
          title: "Notifications ❗",
          href: ROUTES.MANAGER_NOTIFICATIONS,
          icon: "bell",
        },
      ],
    },
    {
      id: "email",
      label: "Email",
      defaultOpen: true,
      items: [
        {
          title: "Emailing",
          href: ROUTES.MANAGER_EMAILING,
          icon: "mail",
        },
        {
          title: "Sent",
          href: ROUTES.MANAGER_SENT,
          icon: "send",
        },
      ],
    },
    {
      id: "system",
      label: "System",
      defaultOpen: true,
      items: [
        {
          title: "Reports ❗",
          href: ROUTES.MANAGER_REPORTS,
          icon: "reports",
        },
        {
          title: "Analytics ❗",
          href: ROUTES.MANAGER_ANALYTICS,
          icon: "analytics",
        },
        {
          title: "Backup",
          href: ROUTES.MANAGER_BACKUP,
          icon: "backup",
        },
        {
          title: "Logs",
          href: ROUTES.MANAGER_LOGS,
          icon: "logs",
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

export const CEO_PANEL_NAVIGATION: PanelNavigation = {
  items: [
    {
      title: "Dashboard",
      href: ROUTES.CEO_DASHBOARD,
      icon: "layout-dashboard",
    },
    {
      title: "Users analysis",
      href: ROUTES.CEO_USERS_ANALYSIS,
      icon: "users",
    },
    {
      title: "Teachers analysis",
      href: ROUTES.CEO_TEACHERS_ANALYSIS,
      icon: "book-open",
    },
    {
      title: "Classes analysis",
      href: ROUTES.CEO_CLASSES_ANALYSIS,
      icon: "school",
    },
    {
      title: "Subjects analysis",
      href: ROUTES.CEO_SUBJECTS_ANALYSIS,
      icon: "library",
    },
    {
      title: "Accounting analysis",
      href: ROUTES.CEO_ACCOUNTING_ANALYSIS,
      icon: "calculator",
    },
    {
      title: "Notifications",
      href: ROUTES.CEO_NOTIFICATIONS,
      icon: "bell",
    },
    {
      title: "Tasks analysis",
      href: ROUTES.CEO_TASKS_ANALYSIS,
      icon: "reports",
    },
  ],
};

/** @deprecated Use `CEO_PANEL_NAVIGATION` — kept for flatten/search helpers. */
export const CEO_PANEL_NAV: PanelNavItem[] = CEO_PANEL_NAVIGATION.items!;
export const TEACHER_PANEL_NAVIGATION: PanelNavigation = {
  items: [
    {
      title: "Dashboard",
      href: ROUTES.TEACHER_DASHBOARD,
      icon: "layout-dashboard",
    },
    {
      title: "Schedule",
      href: ROUTES.TEACHER_SCHEDULE,
      icon: "calendar-days",
    },
    {
      title: "Manage classes",
      href: ROUTES.TEACHER_CLASSES,
      icon: "school",
    },
    {
      title: "Subjects",
      href: ROUTES.TEACHER_SUBJECTS,
      icon: "library",
    },
    {
      title: "My students",
      href: ROUTES.TEACHER_STUDENTS,
      icon: "book-open",
    },
    {
      title: "Notifications",
      href: ROUTES.TEACHER_NOTIFICATIONS,
      icon: "bell",
    },
    {
      title: "Analytics",
      href: ROUTES.TEACHER_ANALYTICS,
      icon: "analytics",
    },
  ],
};

/** @deprecated Use `TEACHER_PANEL_NAVIGATION` — kept for flatten/search helpers. */
export const TEACHER_PANEL_NAV: PanelNavItem[] = TEACHER_PANEL_NAVIGATION.items!;
export const STUDENT_PANEL_NAVIGATION: PanelNavigation = {
  items: [
    {
      title: "Dashboard",
      href: ROUTES.STUDENT_DASHBOARD,
      icon: "layout-dashboard",
    },
    {
      title: "Classes",
      href: ROUTES.STUDENT_CLASSES,
      icon: "school",
    },
    {
      title: "Finance",
      href: ROUTES.STUDENT_FINANCE,
      icon: "calculator",
    },
    {
      title: "Analytics",
      href: ROUTES.STUDENT_ANALYTICS,
      icon: "analytics",
    },
    {
      title: "Notifications",
      href: ROUTES.STUDENT_NOTIFICATIONS,
      icon: "bell",
    },
  ],
};

/** @deprecated Use `STUDENT_PANEL_NAVIGATION` — kept for flatten/search helpers. */
export const STUDENT_PANEL_NAV: PanelNavItem[] = STUDENT_PANEL_NAVIGATION.items!;
export const ADMIN_PANEL_NAVIGATION = dashboardNavigation(ROUTES.ADMIN_DASHBOARD);
