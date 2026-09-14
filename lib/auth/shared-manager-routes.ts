import { ROUTES } from "@/lib/constants/routes";

/**
 * Workshop paths that other roles may enter when they are
 * instructors and hold the matching view permission.
 */
const SHARED_MANAGER_WORKSHOP_PREFIXES = [
  ROUTES.MANAGER_WORKSHOPS_PAYMENTS,
  ROUTES.MANAGER_WORKSHOPS,
] as const;

/**
 * Shared manager paths that do **not** require `is_instructor`
 * (managers/CEOs manage the flag; they need not be instructors themselves).
 */
const SHARED_MANAGER_NO_INSTRUCTOR_FLAG_PREFIXES = [
  ROUTES.MANAGER_INSTRUCTORS,
  ROUTES.MANAGER_INSTRUCTOR_SCHEDULES,
  ROUTES.MANAGER_CLOUDFLARE_AI_USAGE,
  ROUTES.MANAGER_INCOME_STATEMENT_ANALYTICS,
  ROUTES.MANAGER_ACADEMIC_ANALYSIS,
  ROUTES.MANAGER_GUESTS,
  ROUTES.MANAGER_REGISTRATIONS,
] as const;

function pathMatchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isSharedManagerWorkshopPath(pathname: string): boolean {
  return SHARED_MANAGER_WORKSHOP_PREFIXES.some((prefix) =>
    pathMatchesPrefix(pathname, prefix)
  );
}

export function isSharedManagerInstructorsPath(pathname: string): boolean {
  return pathMatchesPrefix(pathname, ROUTES.MANAGER_INSTRUCTORS);
}

export function isSharedManagerCloudflareAiUsagePath(
  pathname: string
): boolean {
  return pathMatchesPrefix(pathname, ROUTES.MANAGER_CLOUDFLARE_AI_USAGE);
}

export function isSharedManagerPath(pathname: string): boolean {
  return (
    isSharedManagerWorkshopPath(pathname) ||
    SHARED_MANAGER_NO_INSTRUCTOR_FLAG_PREFIXES.some((prefix) =>
      pathMatchesPrefix(pathname, prefix)
    )
  );
}
