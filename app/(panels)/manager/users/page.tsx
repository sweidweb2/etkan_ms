import { ManageUsersPanel } from "@/components/manager/users/manage-users-panel";
import { getSessionPack } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listUsersForManager } from "@/services/auth/user.service";

export default async function ManagerUsersPage() {
  const adminClient = createSupabaseAdminClient();
  const pack = await getSessionPack();
  const users = await listUsersForManager(adminClient, pack.user?.id ?? null);

  return (
    <ManageUsersPanel
      initialUsers={users}
      currentUserId={pack.user?.id ?? null}
    />
  );
}
