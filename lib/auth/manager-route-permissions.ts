import {
  PERMISSIONS,
  type PermissionKey,
} from "@/lib/constants/permissions";
import { ROUTES } from "@/lib/constants/routes";

type PrefixRule = {
  prefix: string;
  permission: PermissionKey;
};

/**
 * Static manager path prefixes → required view permission.
 * Longer prefixes are matched first (see `MANAGER_ROUTE_PREFIX_RULES`).
 */
const MANAGER_ROUTE_PREFIX_RULES_UNSORTED: readonly PrefixRule[] = [
  {
    prefix: ROUTES.MANAGER_EQUIPMENT_BORROW,
    permission: PERMISSIONS.EQUIPMENT_VIEW_BORROWS,
  },
  {
    prefix: ROUTES.MANAGER_DASHBOARD,
    permission: PERMISSIONS.DASHBOARD_VIEW,
  },
  { prefix: ROUTES.MANAGER_USERS, permission: PERMISSIONS.USERS_VIEW },
  { prefix: ROUTES.MANAGER_STUDENTS, permission: PERMISSIONS.STUDENTS_VIEW },
  {
    prefix: ROUTES.MANAGER_RELATIONSHIPS,
    permission: PERMISSIONS.RELATIONSHIPS_VIEW,
  },
  { prefix: ROUTES.MANAGER_SUBJECTS, permission: PERMISSIONS.SUBJECTS_VIEW },
  {
    prefix: ROUTES.MANAGER_INSTRUCTORS,
    permission: PERMISSIONS.INSTRUCTORS_VIEW,
  },
  {
    prefix: ROUTES.MANAGER_INSTRUCTOR_SCHEDULES_DETAILS,
    permission: PERMISSIONS.INSTRUCTOR_SCHEDULES_DETAILS_VIEW,
  },
  {
    prefix: ROUTES.MANAGER_INSTRUCTOR_SCHEDULES,
    permission: PERMISSIONS.INSTRUCTOR_SCHEDULES_VIEW,
  },
  {
    prefix: ROUTES.MANAGER_WORKSHOPS_PAYMENTS,
    permission: PERMISSIONS.WORKSHOPS_PAYMENTS_VIEW,
  },
  {
    prefix: ROUTES.MANAGER_WORKSHOPS,
    permission: PERMISSIONS.WORKSHOPS_VIEW,
  },
  { prefix: ROUTES.MANAGER_CLASSES, permission: PERMISSIONS.CLASSES_VIEW },
  { prefix: ROUTES.MANAGER_SEMESTERS, permission: PERMISSIONS.SEMESTERS_VIEW },
  { prefix: ROUTES.MANAGER_EQUIPMENTS, permission: PERMISSIONS.EQUIPMENT_VIEW },
  { prefix: ROUTES.MANAGER_GALLERY, permission: PERMISSIONS.GALLERY_VIEW },
  { prefix: ROUTES.MANAGER_PROJECTS, permission: PERMISSIONS.PROJECTS_VIEW },
  {
    prefix: ROUTES.MANAGER_ACCOUNTING,
    permission: PERMISSIONS.ACCOUNTING_VIEW,
  },
  {
    prefix: ROUTES.MANAGER_INCOME_STATEMENT_ANALYTICS,
    permission: PERMISSIONS.ACCOUNTING_INCOME_STATEMENT_ANALYTICS_VIEW,
  },
  {
    prefix: ROUTES.MANAGER_INCOME_STATEMENT_HISTORY,
    permission: PERMISSIONS.ACCOUNTING_INCOME_STATEMENT_VIEW,
  },
  {
    prefix: ROUTES.MANAGER_INCOME_STATEMENT,
    permission: PERMISSIONS.ACCOUNTING_INCOME_STATEMENT_VIEW,
  },
  { prefix: ROUTES.MANAGER_SCHEDULE, permission: PERMISSIONS.SCHEDULE_VIEW },
  {
    prefix: ROUTES.MANAGER_NOTIFICATIONS,
    permission: PERMISSIONS.NOTIFICATIONS_VIEW,
  },
  { prefix: ROUTES.MANAGER_EMAILING, permission: PERMISSIONS.EMAILING_VIEW },
  { prefix: ROUTES.MANAGER_SENT, permission: PERMISSIONS.EMAILING_VIEW },
  { prefix: ROUTES.MANAGER_REPORTS, permission: PERMISSIONS.REPORTS_VIEW },
  { prefix: ROUTES.MANAGER_ANALYTICS, permission: PERMISSIONS.ANALYTICS_VIEW },
  { prefix: ROUTES.MANAGER_BACKUP, permission: PERMISSIONS.BACKUP_VIEW },
  { prefix: ROUTES.MANAGER_LOGS, permission: PERMISSIONS.LOGS_VIEW },
  {
    prefix: ROUTES.MANAGER_CLOUDFLARE_AI_USAGE,
    permission: PERMISSIONS.CLOUDFLARE_AI_USAGE_VIEW,
  },
  {
    prefix: ROUTES.MANAGER_REGISTRATIONS,
    permission: PERMISSIONS.REGISTRATIONS_VIEW,
  },
  {
    prefix: ROUTES.MANAGER_GUESTS,
    permission: PERMISSIONS.GUESTS_VIEW,
  },
  { prefix: ROUTES.MANAGER_CRON_JOBS, permission: PERMISSIONS.CRON_JOBS_VIEW },
  { prefix: ROUTES.MANAGER_RBAC, permission: PERMISSIONS.RBAC_MANAGE },
  { prefix: ROUTES.MANAGER_SETTINGS, permission: PERMISSIONS.SETTINGS_VIEW },
];

export const MANAGER_ROUTE_PREFIX_RULES: readonly PrefixRule[] = [
  ...MANAGER_ROUTE_PREFIX_RULES_UNSORTED,
].sort((a, b) => b.prefix.length - a.prefix.length);

function pathMatchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/**
 * Nested class routes with dynamic ids:
 * `/manager/classes/:id/grades...` → grades.view
 * `/manager/classes/:id/sessions/:sid/tasks...` → tasks.view
 * `/manager/classes/:id/sessions...` → sessions.view
 */
function getClassNestedViewPermission(
  pathname: string
): PermissionKey | null {
  const segments = pathname.split("/").filter(Boolean);
  if (
    segments[0] !== "manager" ||
    segments[1] !== "classes" ||
    segments.length < 4
  ) {
    return null;
  }

  if (segments[3] === "grades") {
    return PERMISSIONS.GRADES_VIEW;
  }

  if (segments[3] === "sessions") {
    if (segments[5] === "tasks") {
      return PERMISSIONS.TASKS_VIEW;
    }
    return PERMISSIONS.SESSIONS_VIEW;
  }

  return null;
}

/**
 * Resolve the view permission required to open a manager path.
 * Returns `null` when the path is not a known manager feature route.
 */
export function getRequiredViewPermissionForManagerPath(
  pathname: string
): PermissionKey | null {
  if (
    pathname !== ROUTES.MANAGER_ROOT &&
    !pathname.startsWith(`${ROUTES.MANAGER_ROOT}/`)
  ) {
    return null;
  }

  const nested = getClassNestedViewPermission(pathname);
  if (nested) {
    return nested;
  }

  for (const rule of MANAGER_ROUTE_PREFIX_RULES) {
    if (pathMatchesPrefix(pathname, rule.prefix)) {
      return rule.permission;
    }
  }

  return null;
}
