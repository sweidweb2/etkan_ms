import { BackupExportPanel } from "@/components/manager/backup/backup-export-panel";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/services/auth.service";
import { hasPermission } from "@/services/authorization.service";
import { getRecentBackupHistory } from "@/services/backup-history.service";
import type { BackupHistoryEntry } from "@/types/backup-history";

export default async function ManagerBackupPage() {
  const sessionClient = await createSupabaseServerComponentClient();
  const user = await getCurrentUser(sessionClient);

  let history: BackupHistoryEntry[] = [];

  if (user) {
    const adminClient = createSupabaseAdminClient();
    const canView = await hasPermission(
      adminClient,
      user.id,
      PERMISSIONS.BACKUP_VIEW
    );

    if (canView) {
      history = await getRecentBackupHistory(adminClient);
    }
  }

  return <BackupExportPanel initialHistory={history} />;
}
