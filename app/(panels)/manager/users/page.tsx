import { ManageUsersPanel } from "@/components/manager/users/manage-users-panel";
import { getSessionPack } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listUsersPageForManager } from "@/services/auth/user.service";

export default async function ManagerUsersPage() {
  const adminClient = createSupabaseAdminClient();
  const pack = await getSessionPack();
  const data = await listUsersPageForManager(adminClient, pack.user?.id ?? null, {
    page: 1,
  });

  return (
    <ManageUsersPanel
      initialData={data}
      currentUserId={pack.user?.id ?? null}
    />
  );
}
