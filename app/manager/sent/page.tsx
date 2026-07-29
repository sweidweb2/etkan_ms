import { ManageSentEmailsPanel } from "@/components/manager/emailing/manage-sent-emails-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listSentEmailsForManager } from "@/services/email.service";
import { listUsersForManager } from "@/services/user.service";

export default async function ManagerSentEmailsPage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const [emails, users] = await Promise.all([
    listSentEmailsForManager(adminClient, user?.id ?? null),
    listUsersForManager(adminClient, user?.id ?? null),
  ]);

  return (
    <ManageSentEmailsPanel initialEmails={emails} initialUsers={users} />
  );
}
