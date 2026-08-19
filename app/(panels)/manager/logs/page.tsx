import { ManageLogsPanel } from "@/components/manager/logs/manage-logs-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listAuditLogsForManager } from "@/services/ops/audit-log.service";

export default async function ManagerLogsPage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const logsPage = await listAuditLogsForManager(adminClient, user?.id ?? null);

  return (
    <ManageLogsPanel
      initialLogs={logsPage.logs}
      initialNextCursor={logsPage.nextCursor}
    />
  );
}
