import { ManageNotificationsPanel } from "@/components/manager/notifications/manage-notifications-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listNotificationsForManager } from "@/services/communications/notification.service";

export default async function ManagerNotificationsPage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const notifications = await listNotificationsForManager(adminClient, user?.id ?? null);

  return <ManageNotificationsPanel initialNotifications={notifications} />;
}
