import { ManageSentEmailsPanel } from "@/components/manager/emailing/manage-sent-emails-panel";
import { getSessionRole } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listSentEmailsForManager } from "@/services/email.service";
import { listUsersForManager } from "@/services/user.service";

export default async function ManagerSentEmailsPage() {
  const adminClient = createSupabaseAdminClient();
  const role = await getSessionRole();
  const [emails, users] = await Promise.all([
    listSentEmailsForManager(adminClient, role),
    listUsersForManager(adminClient, role),
  ]);

  return (
    <ManageSentEmailsPanel initialEmails={emails} initialUsers={users} />
  );
}
