import { ManageSentEmailsPanel } from "@/components/manager/emailing/manage-sent-emails-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listSentEmailsForManager } from "@/services/communications/email.service";
import { listUsersForManager } from "@/services/auth/user.service";

export default async function ManagerSentEmailsPage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const [emailsPage, users] = await Promise.all([
    listSentEmailsForManager(adminClient, user?.id ?? null),
    listUsersForManager(adminClient, user?.id ?? null),
  ]);

  return (
    <ManageSentEmailsPanel
      initialEmails={emailsPage.emails}
      initialUsers={users}
      totalCount={emailsPage.totalCount}
    />
  );
}
