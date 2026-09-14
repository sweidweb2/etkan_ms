import { ROUTES } from "@/lib/constants/routes";

/**
 * Manager paths supervisors must never open (even if RBAC UI later grants
 * matching view keys). Mirrors excluded seed feature groups.
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
