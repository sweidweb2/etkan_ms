import { ManagePhasesPanel } from "@/components/manager/phases/manage-phases-panel";
import { getSessionRole } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listSemestersForManager } from "@/services/semester.service";

export default async function ManagerPhasesPage() {
  const adminClient = createSupabaseAdminClient();
  const role = await getSessionRole();
  const semesters = await listSemestersForManager(adminClient, role);

  return <ManagePhasesPanel initialSemesters={semesters} />;
}
