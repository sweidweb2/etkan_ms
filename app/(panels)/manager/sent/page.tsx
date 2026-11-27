import { ManageSentEmailsPanel } from "@/components/manager/emailing/manage-sent-emails-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listSentEmailsForManager } from "@/services/communications/email.service";

export default async function ManagerSentEmailsPage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const emailsPage = await listSentEmailsForManager(
    adminClient,
    user?.id ?? null
  );

  return (
    <ManageSentEmailsPanel
      initialEmails={emailsPage.emails}
      totalCount={emailsPage.totalCount}
    />
  );
}
