import { ManagerRbacPanel } from "@/components/manager/rbac/manager-rbac-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getPermissionCatalogForManager,
  listRolesWithPermissionKeys,
} from "@/services/auth/rbac.service";

export default async function ManagerRbacPage() {
  const user = await getSessionUser();
  const adminClient = createSupabaseAdminClient();
  const actorUserId = user?.id ?? null;

  const [grantsByRole, catalog] = await Promise.all([
    listRolesWithPermissionKeys(adminClient, actorUserId),
    getPermissionCatalogForManager(adminClient, actorUserId),
  ]);

  return (
    <ManagerRbacPanel
      initialGrantsByRole={grantsByRole}
      catalog={catalog}
    />
  );
}
