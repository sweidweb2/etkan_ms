import { RolePanelLayout } from "@/components/panels/role-panel-layout";
import { ROLES } from "@/lib/constants/roles";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RolePanelLayout role={ROLES.ADMIN}>{children}</RolePanelLayout>;
}
