import { ManageUsersPanel } from "@/components/manager/users/manage-users-panel";
import { getSessionPack } from "@/lib/auth/session";
import { ROLES } from "@/lib/constants/roles";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listUsersForManager } from "@/services/auth/user.service";

export default async function ManagerUsersPage() {
  const adminClient = createSupabaseAdminClient();
  const pack = await getSessionPack();
  const users = await listUsersForManager(adminClient, pack.user?.id ?? null);
  // Students are managed under Manage students — exclude them here.
  const staffUsers = users.filter((user) => user.role !== ROLES.STUDENT);

  return (
    <ManageUsersPanel
      initialUsers={staffUsers}
      currentUserId={pack.user?.id ?? null}
    />
  );
}
