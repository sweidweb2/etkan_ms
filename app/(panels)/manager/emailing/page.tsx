import { ManageEmailingPanel } from "@/components/manager/emailing/manage-emailing-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listEmailingTableFilterDataForManager } from "@/services/communications/email.service";
import { listUsersForManager } from "@/services/auth/user.service";

export default async function ManagerEmailingPage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const [users, filterData] = await Promise.all([
    listUsersForManager(adminClient, user?.id ?? null),
    listEmailingTableFilterDataForManager(adminClient, user?.id ?? null),
  ]);

  return (
    <ManageEmailingPanel
      initialUsers={users}
      classes={filterData.classes}
    />
  );
}
