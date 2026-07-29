import { ManagerAnalyticsPanel } from "@/components/manager/analytics/manager-analytics-panel";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { assertPermission } from "@/services/authorization.service";

export default async function ManagerAnalyticsPage() {
  const user = await getSessionUser();
  const adminClient = createSupabaseAdminClient();
  await assertPermission(
    adminClient,
    user?.id ?? null,
    PERMISSIONS.ANALYTICS_VIEW
  );

  return <ManagerAnalyticsPanel />;
}
