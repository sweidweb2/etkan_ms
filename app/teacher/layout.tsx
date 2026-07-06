import { RolePanelLayout } from "@/components/panels/role-panel-layout";
import { ROLES } from "@/lib/constants/roles";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RolePanelLayout role={ROLES.TEACHER}>{children}</RolePanelLayout>;
}
