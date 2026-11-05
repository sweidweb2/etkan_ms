import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireManagerRoutePermission } from "@/lib/auth/require-manager-route-permission";
import {
  isSharedManagerPath,
  isSharedManagerWorkshopPath,
} from "@/lib/auth/shared-manager-routes";
import {
  getNavRscTimingBag,
  getSessionCanAccessManageWorkshops,
  getSessionRole,
} from "@/lib/auth/session";
import { ROLES } from "@/lib/constants/roles";
import {
  getDashboardRouteForRole,
  ROUTES,
} from "@/lib/constants/routes";
import {
  NAV_TIMING_HEADER,
  isNavTimingEnabled,
  navNowMs,
  navTimingServerLog,
} from "@/lib/debug/nav-timing";

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const debugOn = isNavTimingEnabled();
  const start = debugOn ? navNowMs() : 0;
  const headerList = await headers();
  const pathname = headerList.get("x-pathname") ?? "";
  const tripId = debugOn ? headerList.get(NAV_TIMING_HEADER) : null;

  const role = await getSessionRole();

  if (!role) {
    redirect(ROUTES.LOGIN);
  }

  if (role === ROLES.MANAGER || role === ROLES.SUPERVISOR) {
    await requireManagerRoutePermission(pathname);
    if (debugOn) {
      const bag = getNavRscTimingBag();
      bag.manager_layout = navNowMs() - start;
      navTimingServerLog(tripId ?? "rsc", "manager_layout", {
        manager_layout: bag.manager_layout,
      });
    }
    return children;
  }

  if (!isSharedManagerPath(pathname)) {
    redirect(getDashboardRouteForRole(role));
  }

  // Workshop shared UI requires the instructor attribute.
  // Instructors list, schedules, and AI usage do not (CEO need not be flagged).
  if (isSharedManagerWorkshopPath(pathname)) {
    const canAccess = await getSessionCanAccessManageWorkshops();
    if (!canAccess) {
      redirect(getDashboardRouteForRole(role));
    }
  }

  await requireManagerRoutePermission(pathname);
  if (debugOn) {
    const bag = getNavRscTimingBag();
    bag.manager_layout = navNowMs() - start;
    navTimingServerLog(tripId ?? "rsc", "manager_layout", {
      manager_layout: bag.manager_layout,
    });
  }
  return children;
}
