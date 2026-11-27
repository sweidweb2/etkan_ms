import { ManageEmailingPanel } from "@/components/manager/emailing/manage-emailing-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listEmailingTableFilterDataForManager } from "@/services/communications/email.service";
import { listEmailingRecipientsPageForManager } from "@/services/auth/user.service";

export default async function ManagerEmailingPage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const [recipients, filterData] = await Promise.all([
    listEmailingRecipientsPageForManager(adminClient, user?.id ?? null, {
      page: 1,
    }),
    listEmailingTableFilterDataForManager(adminClient, user?.id ?? null),
  ]);

  return (
    <ManageEmailingPanel
      initialData={recipients}
      classes={filterData.classes}
    />
  );
}
