import { ManagerDashboardPanel } from "@/components/manager/dashboard/manager-dashboard-panel";
import { getSessionRole } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getManagerDashboardForManager } from "@/services/manager-dashboard.service";

export default async function ManagerDashboardPage() {
  const adminClient = createSupabaseAdminClient();
  const role = await getSessionRole();
  const data = await getManagerDashboardForManager(adminClient, role);

  return <ManagerDashboardPanel data={data} />;
}
