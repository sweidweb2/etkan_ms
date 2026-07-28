import { ManageEmailingPanel } from "@/components/manager/emailing/manage-emailing-panel";
import { getSessionRole } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listUsersForManager } from "@/services/user.service";

export default async function ManagerEmailingPage() {
  const adminClient = createSupabaseAdminClient();
  const role = await getSessionRole();
  const users = await listUsersForManager(adminClient, role);

  return <ManageEmailingPanel initialUsers={users} />;
}
