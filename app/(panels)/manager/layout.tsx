import { headers } from "next/headers";
import { requireManagerRoutePermission } from "@/lib/auth/require-manager-route-permission";
import { requireRole } from "@/lib/auth/require-role";
import { ROLES } from "@/lib/constants/roles";

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = (await headers()).get("x-pathname") ?? "";
  await requireRole(ROLES.MANAGER);
  await requireManagerRoutePermission(pathname);
  return children;
}
