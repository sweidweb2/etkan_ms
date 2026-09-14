import { ManageUsersPanel } from "@/components/manager/users/manage-users-panel";
import { getSessionPack } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { ROLES } from "@/lib/constants/roles";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listUsersForManager } from "@/services/auth/user.service";

export default async function ManagerUsersPage() {
  const adminClient = createSupabaseAdminClient();
  const pack = await getSessionPack();
  const users = await listUsersForManager(adminClient, pack.user?.id ?? null);

  const canManageOverlays =
    pack.role === ROLES.MANAGER &&
    pack.permissions.has(PERMISSIONS.RBAC_MANAGE);

  return (
    <ManageUsersPanel
      initialUsers={users}
      currentUserId={pack.user?.id ?? null}
      canManageOverlays={canManageOverlays}
    />
  );
}
