import { ComposeLetterPanel } from "@/components/manager/emailing/compose-letter-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listUsersForManager } from "@/services/auth/user.service";

export default async function ManagerEmailingComposePage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const users = await listUsersForManager(adminClient, user?.id ?? null);

  return <ComposeLetterPanel initialUsers={users} />;
}
