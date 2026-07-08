import { BackupExportPanel } from "@/components/manager/backup/backup-export-panel";
import { ROLES } from "@/lib/constants/roles";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/services/auth.service";
import { getRecentBackupHistory } from "@/services/backup-history.service";
import { resolveUserRole } from "@/services/role.service";

export default async function ManagerBackupPage() {
  const sessionClient = await createSupabaseServerComponentClient();
  const user = await getCurrentUser(sessionClient);

  let history = [];

  if (user) {
    const role = await resolveUserRole(sessionClient, user);

    if (role === ROLES.MANAGER || role === ROLES.ADMIN) {
      history = await getRecentBackupHistory(createSupabaseAdminClient());
    }
  }

  return <BackupExportPanel initialHistory={history} />;
}
