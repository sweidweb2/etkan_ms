import { RolePanelLayout } from "@/components/panels/role-panel-layout";
import { ROLES } from "@/lib/constants/roles";

export default function CoManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RolePanelLayout role={ROLES.CO_MANAGER}>{children}</RolePanelLayout>
  );
}
