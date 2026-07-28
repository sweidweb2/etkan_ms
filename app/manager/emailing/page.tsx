import { ManageEmailingPanel } from "@/components/manager/emailing/manage-emailing-panel";
import { getSessionRole } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listEmailingTableFilterDataForManager } from "@/services/email.service";
import { listUsersForManager } from "@/services/user.service";

export default async function ManagerEmailingPage() {
  const adminClient = createSupabaseAdminClient();
  const role = await getSessionRole();
  const [users, filterData] = await Promise.all([
    listUsersForManager(adminClient, role),
    listEmailingTableFilterDataForManager(adminClient, role),
  ]);

  return (
    <ManageEmailingPanel
      initialUsers={users}
      classes={filterData.classes}
      userClassIds={filterData.userClassIds}
    />
  );
}
