import { headers } from "next/headers";
import { RolePanelLayout } from "@/components/panels/role-panel-layout";
import { requireManagerRoutePermission } from "@/lib/auth/require-manager-route-permission";
import { ROLES } from "@/lib/constants/roles";

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = (await headers()).get("x-pathname") ?? "";

  return (
    <RolePanelLayout
      role={ROLES.MANAGER}
      assertAccess={() => requireManagerRoutePermission(pathname)}
    >
      {children}
    </RolePanelLayout>
  );
}
