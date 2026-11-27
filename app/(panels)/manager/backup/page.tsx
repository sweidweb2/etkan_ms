import { BackupExportPanel } from "@/components/manager/backup/backup-export-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getRecentBackupHistory } from "@/services/backup/backup-history.service";
import type { BackupHistoryEntry } from "@/types/backup-history";

export default async function ManagerBackupPage() {
  const user = await getSessionUser();

  let history: BackupHistoryEntry[] = [];

  if (user) {
    const adminClient = createSupabaseAdminClient();
    history = await getRecentBackupHistory(adminClient, user.id);
  }

  return <BackupExportPanel initialHistory={history} />;
}
