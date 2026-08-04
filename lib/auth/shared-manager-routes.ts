import { ROUTES } from "@/lib/constants/routes";

/**
 * Manager workshop paths that other roles may enter when they are instructors
 * and hold the matching view permission. Keep this list intentionally small.
 */
const SHARED_MANAGER_WORKSHOP_PREFIXES = [
  ROUTES.MANAGER_WORKSHOPS_PAYMENTS,
  ROUTES.MANAGER_WORKSHOPS,
] as const;

function pathMatchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isSharedManagerWorkshopPath(pathname: string): boolean {
  return SHARED_MANAGER_WORKSHOP_PREFIXES.some((prefix) =>
    pathMatchesPrefix(pathname, prefix)
  );
}
