import { ComposeLetterPanel } from "@/components/manager/emailing/compose-letter-panel";
import { getSessionRole } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listUsersForManager } from "@/services/user.service";

export default async function ManagerEmailingComposePage() {
  const adminClient = createSupabaseAdminClient();
  const role = await getSessionRole();
  const users = await listUsersForManager(adminClient, role);

  return <ComposeLetterPanel initialUsers={users} />;
}
