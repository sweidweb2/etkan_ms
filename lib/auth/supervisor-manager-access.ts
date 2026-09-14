import { ROUTES } from "@/lib/constants/routes";

/**
 * Manager paths supervisors must never open (even if RBAC UI later grants
 * matching view keys). Complements the supervisor seed allow-list
 * (workshops / subjects / students / classes / instructor schedules /
 * academic analysis).
 */
export const SUPERVISOR_FORBIDDEN_MANAGER_PREFIXES = [
  ROUTES.MANAGER_USERS,
  ROUTES.MANAGER_ACCOUNTING,
  ROUTES.MANAGER_INCOME_STATEMENT,
  ROUTES.MANAGER_EMAILING,
  ROUTES.MANAGER_SENT,
  ROUTES.MANAGER_GALLERY,
  ROUTES.MANAGER_PROJECTS,
  ROUTES.MANAGER_BLOGS,
  ROUTES.MANAGER_NOTIFICATIONS,
  ROUTES.MANAGER_BACKUP,
  ROUTES.MANAGER_LOGS,
  ROUTES.MANAGER_RBAC,
  ROUTES.MANAGER_SETTINGS,
  ROUTES.MANAGER_CRON_JOBS,
  ROUTES.MANAGER_GUESTS,
  ROUTES.MANAGER_REGISTRATIONS,
  ROUTES.MANAGER_EQUIPMENTS,
  ROUTES.MANAGER_INSTRUCTORS,
  ROUTES.MANAGER_SEMESTERS,
  ROUTES.MANAGER_CLOUDFLARE_AI_USAGE,
] as const;

function pathMatchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isManagerPanelPath(pathname: string): boolean {
  return (
    pathname === ROUTES.MANAGER_ROOT ||
    pathname.startsWith(`${ROUTES.MANAGER_ROOT}/`)
  );
}

export function isSupervisorForbiddenManagerPath(pathname: string): boolean {
  return SUPERVISOR_FORBIDDEN_MANAGER_PREFIXES.some((prefix) =>
    pathMatchesPrefix(pathname, prefix)
  );
}
