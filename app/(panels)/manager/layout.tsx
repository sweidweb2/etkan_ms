import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireManagerRoutePermission } from "@/lib/auth/require-manager-route-permission";
import { isSharedManagerWorkshopPath } from "@/lib/auth/shared-manager-routes";
import {
  getSessionIsInstructor,
  getSessionRole,
} from "@/lib/auth/session";
import { ROLES } from "@/lib/constants/roles";
import {
  getDashboardRouteForRole,
  ROUTES,
} from "@/lib/constants/routes";

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = (await headers()).get("x-pathname") ?? "";
  const role = await getSessionRole();

  if (!role) {
    redirect(ROUTES.LOGIN);
  }

  if (role === ROLES.MANAGER) {
    await requireManagerRoutePermission(pathname);
    return children;
  }

  if (!isSharedManagerWorkshopPath(pathname)) {
    redirect(getDashboardRouteForRole(role));
  }

  const isInstructor = await getSessionIsInstructor();
  if (!isInstructor) {
    redirect(getDashboardRouteForRole(role));
  }

  await requireManagerRoutePermission(pathname);
  return children;
}
