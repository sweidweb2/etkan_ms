import { ManageNotificationsPanel } from "@/components/manager/notifications/manage-notifications-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listNotificationsPageForManager } from "@/services/communications/notification.service";

export default async function ManagerNotificationsPage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const pageData = await listNotificationsPageForManager(
    adminClient,
    user?.id ?? null,
    { page: 1, pageSize: 8 }
  );

  return (
    <ManageNotificationsPanel
      initialNotifications={pageData.notifications}
      initialTotal={pageData.total}
      initialStats={pageData.stats}
      initialPage={pageData.page}
      initialPageSize={pageData.pageSize}
    />
  );
}
