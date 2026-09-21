import { ROUTES } from "@/lib/constants/routes";

/** True when pathname is under the manager panel root. */
export function isManagerPanelPath(pathname: string): boolean {
  return (
    pathname === ROUTES.MANAGER_ROOT ||
    pathname.startsWith(`${ROUTES.MANAGER_ROOT}/`)
  );
}
