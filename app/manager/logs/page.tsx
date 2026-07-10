import { ManageLogsPanel } from "@/components/manager/logs/manage-logs-panel";
import { getSessionRole } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listAuditLogsForManager } from "@/services/audit-log.service";

export default async function ManagerLogsPage() {
  const adminClient = createSupabaseAdminClient();
  const role = await getSessionRole();
  const logs = await listAuditLogsForManager(adminClient, role);

  return <ManageLogsPanel initialLogs={logs} />;
}
