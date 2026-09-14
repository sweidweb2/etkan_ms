import { ManagePrivatePermissionsPanel } from "@/components/manager/rbac/manage-private-permissions-panel";
import { getSessionPack } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { ROLES } from "@/lib/constants/roles";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listUsersForManager } from "@/services/auth/user.service";
import {
  listPrivatePermissionSummariesForManager,
  type PrivatePermissionUserSummary,
} from "@/services/auth/user-permissions.service";
import type { ManagerUserRow } from "@/types/manager-user";

export default async function ManagerRbacPrivatePage() {
  const pack = await getSessionPack();
  const adminClient = createSupabaseAdminClient();
  const actorUserId = pack.user?.id ?? null;

  const canManageOverlays =
    pack.role === ROLES.MANAGER &&
    pack.permissions.has(PERMISSIONS.RBAC_MANAGE);

  let users: ManagerUserRow[] = [];
  let summaries: PrivatePermissionUserSummary[] = [];

  if (canManageOverlays) {
    const [userRows, summariesResult] = await Promise.all([
      listUsersForManager(adminClient, actorUserId),
      listPrivatePermissionSummariesForManager(adminClient, actorUserId),
    ]);
    users = userRows;
    if (!("error" in summariesResult)) {
      summaries = summariesResult;
    }
  }

  return (
    <ManagePrivatePermissionsPanel
      users={users}
      summaries={summaries}
      canManageOverlays={canManageOverlays}
    />
  );
}
