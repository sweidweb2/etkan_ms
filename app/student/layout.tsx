import { RolePanelLayout } from "@/components/panels/role-panel-layout";
import { ROLES } from "@/lib/constants/roles";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RolePanelLayout role={ROLES.STUDENT}>{children}</RolePanelLayout>;
}
