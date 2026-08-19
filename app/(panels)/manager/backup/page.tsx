import { BackupExportPanel } from "@/components/manager/backup/backup-export-panel";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/services/auth/auth.service";
import { getRecentBackupHistory } from "@/services/backup/backup-history.service";
import type { BackupHistoryEntry } from "@/types/backup-history";

export default async function ManagerBackupPage() {
  const sessionClient = await createSupabaseServerComponentClient();
  const user = await getCurrentUser(sessionClient);

  let history: BackupHistoryEntry[] = [];

  if (user) {
    const adminClient = createSupabaseAdminClient();
    history = await getRecentBackupHistory(adminClient);
  }

  return <BackupExportPanel initialHistory={history} />;
}
