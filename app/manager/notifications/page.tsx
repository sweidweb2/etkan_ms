import { ManageNotificationsPanel } from "@/components/manager/notifications/manage-notifications-panel";
import { getSessionRole } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listNotificationsForManager } from "@/services/notification.service";

export default async function ManagerNotificationsPage() {
  const adminClient = createSupabaseAdminClient();
  const role = await getSessionRole();
  const notifications = await listNotificationsForManager(adminClient, role);

  return <ManageNotificationsPanel initialNotifications={notifications} />;
}
