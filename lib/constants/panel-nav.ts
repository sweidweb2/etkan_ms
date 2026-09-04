import { ROUTES } from "@/lib/constants/routes";
import type { PanelNavItem, PanelNavigation } from "@/types/panel";

/** Shared across roles; filtered by `workshops.view` + `is_instructor`. */
const MANAGE_WORKSHOPS_NAV_ITEM: PanelNavItem = {
  title: "Manage workshops",
  href: ROUTES.MANAGER_WORKSHOPS,
  icon: "presentation",
};

function withManageWorkshops(navigation: PanelNavigation): PanelNavigation {
  return {
    ...navigation,
    items: [...(navigation.items ?? []), MANAGE_WORKSHOPS_NAV_ITEM],
  };
}

export const ADMIN_PANEL_NAVIGATION = withManageWorkshops({ items: [] });
/** @deprecated Use `ADMIN_PANEL_NAVIGATION` — kept for flatten/search helpers. */
export const ADMIN_PANEL_NAV = ADMIN_PANEL_NAVIGATION.items!;
export const CO_MANAGER_PANEL_NAVIGATION = withManageWorkshops({ items: [] });
export const CO_MANAGER_PANEL_NAV = CO_MANAGER_PANEL_NAVIGATION.items!;
export const TRAINER_PANEL_NAVIGATION = withManageWorkshops({ items: [] });
export const TRAINER_PANEL_NAV = TRAINER_PANEL_NAVIGATION.items!;

export const MANAGER_PANEL_NAVIGATION: PanelNavigation = {
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
          title: "Registrations",
          href: ROUTES.MANAGER_REGISTRATIONS,
          icon: "clipboard-list",
        },
        {
          title: "Guests",
          href: ROUTES.MANAGER_GUESTS,
          icon: "user-plus",
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
          title: "Manage teams",
          href: ROUTES.MANAGER_SEMESTERS,
          icon: "layers",
        },
      ],
    },
    {
      id: "resources",
      label: "Resources",
      defaultOpen: true,
      items: [
        {
          title: "Manage equipments",
          href: ROUTES.MANAGER_EQUIPMENTS,
          icon: "package",
        },
      ],
    },
    {
      id: "instructors-workshops",
      label: "Instructors & workshops",
      defaultOpen: true,
      items: [
        {
          title: "Manage instructors",
          href: ROUTES.MANAGER_INSTRUCTORS,
          icon: "school",
        },
        {
          title: "Instructor schedules",
          href: ROUTES.MANAGER_INSTRUCTOR_SCHEDULES,
          icon: "calendar-days",
        },
        {
          title: "Manage workshops",
          href: ROUTES.MANAGER_WORKSHOPS,
          icon: "presentation",
        },
        {
          title: "AI usage",
          href: ROUTES.MANAGER_CLOUDFLARE_AI_USAGE,
          icon: "sparkles",
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
          title: "Our finance",
          href: ROUTES.MANAGER_INCOME_STATEMENT,
          icon: "reports",
        },
        {
          title: "Income analytics",
          href: ROUTES.MANAGER_INCOME_STATEMENT_ANALYTICS,
          icon: "analytics",
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
      id: "options",
      label: "Options",
      defaultOpen: true,
      items: [
        {
          title: "Manage gallery",
          href: ROUTES.MANAGER_GALLERY,
          icon: "images",
        },
        {
          title: "Manage projects",
          href: ROUTES.MANAGER_PROJECTS,
          icon: "folder-kanban",
        },
      ],
    },
    {
      id: "system",
      label: "System",
      defaultOpen: true,
      items: [
        {
          title: "Notifications ❗",
          href: ROUTES.MANAGER_NOTIFICATIONS,
          icon: "bell",
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
          title: "Permissions",
          href: ROUTES.MANAGER_RBAC,
          icon: "shield",
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
      title: "Manage instructors",
      href: ROUTES.MANAGER_INSTRUCTORS,
      icon: "school",
    },
    {
      title: "Instructor schedules",
      href: ROUTES.MANAGER_INSTRUCTOR_SCHEDULES,
      icon: "calendar-days",
    },
    MANAGE_WORKSHOPS_NAV_ITEM,
    {
      title: "Guests",
      href: ROUTES.MANAGER_GUESTS,
      icon: "user-plus",
    },
    {
      title: "AI usage",
      href: ROUTES.MANAGER_CLOUDFLARE_AI_USAGE,
      icon: "sparkles",
    },
    {
      title: "Income analytics",
      href: ROUTES.MANAGER_INCOME_STATEMENT_ANALYTICS,
      icon: "analytics",
    },
  ],
};

/** @deprecated Use `CEO_PANEL_NAVIGATION` — kept for flatten/search helpers. */
export const CEO_PANEL_NAV: PanelNavItem[] = CEO_PANEL_NAVIGATION.items!;

/**
 * Supervisor: manager feature links minus excluded ops/system surfaces
 * (users, accounting/finance, email, gallery, projects, notifications,
 * backup, logs, rbac, settings).
 */
export const SUPERVISOR_PANEL_NAVIGATION: PanelNavigation = {
  groups: [
    {
      id: "people",
      label: "People",
      defaultOpen: true,
      items: [
        {
          title: "Manage students",
          href: ROUTES.MANAGER_STUDENTS,
          icon: "book-open",
        },
        {
          title: "Registrations",
          href: ROUTES.MANAGER_REGISTRATIONS,
          icon: "clipboard-list",
        },
        {
          title: "Guests",
          href: ROUTES.MANAGER_GUESTS,
          icon: "user-plus",
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
          title: "Manage teams",
          href: ROUTES.MANAGER_SEMESTERS,
          icon: "layers",
        },
      ],
    },
    {
      id: "resources",
      label: "Resources",
      defaultOpen: true,
      items: [
        {
          title: "Manage equipments",
          href: ROUTES.MANAGER_EQUIPMENTS,
          icon: "package",
        },
      ],
    },
    {
      id: "instructors-workshops",
      label: "Instructors & workshops",
      defaultOpen: true,
      items: [
        {
          title: "Manage instructors",
          href: ROUTES.MANAGER_INSTRUCTORS,
          icon: "school",
        },
        {
          title: "Instructor schedules",
          href: ROUTES.MANAGER_INSTRUCTOR_SCHEDULES,
          icon: "calendar-days",
        },
        {
          title: "Manage workshops",
          href: ROUTES.MANAGER_WORKSHOPS,
          icon: "presentation",
        },
        {
          title: "AI usage",
          href: ROUTES.MANAGER_CLOUDFLARE_AI_USAGE,
          icon: "sparkles",
        },
      ],
    },
  ],
};

/** @deprecated Use `SUPERVISOR_PANEL_NAVIGATION` — kept for flatten/search helpers. */
export const SUPERVISOR_PANEL_NAV: PanelNavItem[] = [
  ...(SUPERVISOR_PANEL_NAVIGATION.items ?? []),
  ...(SUPERVISOR_PANEL_NAVIGATION.groups?.flatMap((group) => group.items) ??
    []),
];

export const TEACHER_PANEL_NAVIGATION: PanelNavigation = withManageWorkshops({
  items: [
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
});

/** @deprecated Use `TEACHER_PANEL_NAVIGATION` — kept for flatten/search helpers. */
export const TEACHER_PANEL_NAV: PanelNavItem[] = TEACHER_PANEL_NAVIGATION.items!;

/** Student panel: profile, classes, payments. */
export const STUDENT_PANEL_NAVIGATION: PanelNavigation = {
  items: [
    {
      title: "My profile",
      href: ROUTES.STUDENT_ROOT,
      icon: "book-open",
    },
    {
      title: "My classes",
      href: ROUTES.STUDENT_CLASSES,
      icon: "school",
    },
    {
      title: "My payments",
      href: ROUTES.STUDENT_PAYMENTS,
      icon: "calculator",
    },
  ],
};

/** @deprecated Use `STUDENT_PANEL_NAVIGATION` — kept for flatten/search helpers. */
export const STUDENT_PANEL_NAV: PanelNavItem[] = STUDENT_PANEL_NAVIGATION.items!;
