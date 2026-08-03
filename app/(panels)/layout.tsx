import { redirect } from "next/navigation";
import { RolePanelLayout } from "@/components/panels/role-panel-layout";
import { getSessionRole } from "@/lib/auth/session";
import { ROUTES } from "@/lib/constants/routes";

/**
 * Shared shell for all role panels.
 * Keeping one layout parent means sidebar/header stay mounted when
 * navigating between role panel segments.
 */
export default async function PanelsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const role = await getSessionRole();
  if (!role) {
    redirect(ROUTES.LOGIN);
  }

  return <RolePanelLayout role={role}>{children}</RolePanelLayout>;
}
