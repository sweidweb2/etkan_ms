import { ROUTES } from "@/lib/constants/routes";
import type {
  PanelNavGroup,
  PanelNavItem,
  PanelNavigation,
} from "@/types/panel";

/** Shared across roles; filtered by `workshops.view` + instructor (or manager/supervisor role). */
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
/** Co-manager: same as admin — workshops only when instructor. */
export const CO_MANAGER_PANEL_NAVIGATION = withManageWorkshops({ items: [] });

/**
 * Manager sidebar groups parked on `/manager/pages` while focus is elsewhere.
 * Cards on that hub still navigate to the same routes (permission-filtered).
 */
export const MANAGER_PAGES_HUB_GROUPS: PanelNavGroup[] = [
  {
    id: "people",
    label: "People",
    defaultOpen: true,
    items: [
      {
        title: "Registrations",
        href: ROUTES.MANAGER_REGISTRATIONS,
        icon: "clipboard-list",
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
      {
        title: "Manage blogs",
        href: ROUTES.MANAGER_BLOGS,
        icon: "book-open",
      },
    ],
  },
  {
    id: "system",
    label: "System",
    defaultOpen: true,
    items: [
      {
        title: "Notifications",
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
    ],
  },
];

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
          title: "Manage semesters",
          href: ROUTES.MANAGER_SEMESTERS,
          icon: "layers",
        },
        {
          title: "Academic analysis",
          href: ROUTES.MANAGER_ACADEMIC_ANALYSIS,
          icon: "book-open",
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
      id: "system",
      label: "System",
      defaultOpen: true,
      items: [
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
        {
          title: "Pages",
          href: ROUTES.MANAGER_PAGES,
          icon: "layout-dashboard",
        },
      ],
    },
  ],
};

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
      title: "Income analytics",
      href: ROUTES.MANAGER_INCOME_STATEMENT_ANALYTICS,
      icon: "analytics",
    },
    {
      title: "Academic analysis",
      href: ROUTES.MANAGER_ACADEMIC_ANALYSIS,
      icon: "book-open",
    },
  ],
};

/** CRM: guests (+ Manage workshops when instructor + workshops.view). */
export const CRM_PANEL_NAVIGATION = withManageWorkshops({
  items: [
    {
      title: "Guests",
      href: ROUTES.MANAGER_GUESTS,
      icon: "user-plus",
    },
  ],
});

/**
 * Supervisor: same manager catalog; `filterPanelNavigation` keeps only
 * items whose view permission is granted (seed defaults + RBAC extras).
 */
export const SUPERVISOR_PANEL_NAVIGATION: PanelNavigation =
  MANAGER_PANEL_NAVIGATION;

/**
 * Teacher app bar: no fixed landing links (center search replaces them).
 * Manage workshops still follows when instructor + workshops.view.
 */
export const TEACHER_PANEL_NAVIGATION = withManageWorkshops({
  items: [],
});

/** Student panel: classes, payments, then profile last. */
const STUDENT_PANEL_NAVIGATION_BASE = withManageWorkshops({
  items: [
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
});

export const STUDENT_PANEL_NAVIGATION: PanelNavigation = {
  ...STUDENT_PANEL_NAVIGATION_BASE,
  items: [
    ...(STUDENT_PANEL_NAVIGATION_BASE.items ?? []),
    {
      title: "My profile",
      href: ROUTES.STUDENT_ROOT,
      icon: "book-open",
    },
  ],
};
