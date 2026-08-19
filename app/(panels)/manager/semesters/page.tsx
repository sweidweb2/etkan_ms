import { ManagePhasesPanel } from "@/components/manager/phases/manage-phases-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listSemestersForManager } from "@/services/classes/semester.service";

export default async function ManagerPhasesPage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const semesters = await listSemestersForManager(adminClient, user?.id ?? null);

  return <ManagePhasesPanel initialSemesters={semesters} />;
}
