import { redirect } from "next/navigation";
import { ManagerDashboardPanel } from "@/components/manager/dashboard/manager-dashboard-panel";
import { getSessionUser } from "@/lib/auth/session";
import { ROUTES } from "@/lib/constants/routes";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getManagerDashboardForManager } from "@/services/manager-dashboard.service";

export default async function ManagerDashboardPage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();

  if (!user?.id) {
    redirect(ROUTES.LOGIN);
  }

  const data = await getManagerDashboardForManager(adminClient, user.id);

  return <ManagerDashboardPanel data={data} />;
}
