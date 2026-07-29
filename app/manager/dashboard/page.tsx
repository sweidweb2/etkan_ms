import { ManagerDashboardPanel } from "@/components/manager/dashboard/manager-dashboard-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getManagerDashboardForManager } from "@/services/manager-dashboard.service";

export default async function ManagerDashboardPage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const data = await getManagerDashboardForManager(adminClient, user?.id ?? null);

  return <ManagerDashboardPanel data={data} />;
}
