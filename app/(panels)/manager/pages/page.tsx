import { ManagePagesPanel } from "@/components/manager/pages/manage-pages-panel";
import { filterPanelNavigation } from "@/lib/auth/filter-panel-navigation";
import { getSessionPack } from "@/lib/auth/session";
import { MANAGER_PAGES_HUB_GROUPS } from "@/lib/constants/panel-nav";
import { ROLES } from "@/lib/constants/roles";

export default async function ManagerPagesPage() {
  const pack = await getSessionPack();
  const filtered = filterPanelNavigation(
    { groups: MANAGER_PAGES_HUB_GROUPS },
    pack.permissions,
    {
      isInstructor: pack.isInstructor || pack.role === ROLES.SUPERVISOR,
      isMentor: pack.isMentor || pack.role === ROLES.SUPERVISOR,
    }
  );

  return <ManagePagesPanel groups={filtered.groups ?? []} />;
}
