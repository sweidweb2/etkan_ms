import { ManageUsersPanel } from "@/components/manager/users/manage-users-panel";
import { getSessionRole, getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listUsersForManager } from "@/services/user.service";

export default async function ManagerUsersPage() {
  const adminClient = createSupabaseAdminClient();
  const [role, sessionUser] = await Promise.all([getSessionRole(), getSessionUser()]);
  const users = await listUsersForManager(adminClient, role);

  return (
    <ManageUsersPanel
      initialUsers={users}
      currentUserId={sessionUser?.id ?? null}
    />
  );
}
