import { ManageUsersPanel } from "@/components/manager/users/manage-users-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listUsersForManager } from "@/services/user.service";

export default async function ManagerUsersPage() {
  const adminClient = createSupabaseAdminClient();
  const sessionUser = await getSessionUser();
  const users = await listUsersForManager(adminClient, sessionUser?.id ?? null);

  return (
    <ManageUsersPanel
      initialUsers={users}
      currentUserId={sessionUser?.id ?? null}
    />
  );
}
