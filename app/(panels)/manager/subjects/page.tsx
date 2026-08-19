import { ManageSubjectsPanel } from "@/components/manager/subjects/manage-subjects-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listSubjectsForManager } from "@/services/classes/subject.service";

export default async function ManagerSubjectsPage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const subjects = await listSubjectsForManager(adminClient, user?.id ?? null);

  return <ManageSubjectsPanel initialSubjects={subjects} />;
}
