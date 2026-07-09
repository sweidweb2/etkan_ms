import { ManageSubjectsPanel } from "@/components/manager/subjects/manage-subjects-panel";
import { getSessionRole } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listSubjectsForManager } from "@/services/subject.service";

export default async function ManagerSubjectsPage() {
  const adminClient = createSupabaseAdminClient();
  const role = await getSessionRole();
  const subjects = await listSubjectsForManager(adminClient, role);

  return <ManageSubjectsPanel initialSubjects={subjects} />;
}
