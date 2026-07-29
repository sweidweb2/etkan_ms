import { ManagerReportsPanel } from "@/components/manager/reports/manager-reports-panel";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { assertPermission } from "@/services/authorization.service";

export default async function ManagerReportsPage() {
  const user = await getSessionUser();
  const adminClient = createSupabaseAdminClient();
  await assertPermission(
    adminClient,
    user?.id ?? null,
    PERMISSIONS.REPORTS_VIEW
  );

  return <ManagerReportsPanel />;
}
