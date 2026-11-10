import { ManageSubjectsPanel } from "@/components/manager/subjects/manage-subjects-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listSubjectsForManager } from "@/services/classes/subject.service";
import { listStagesForManager } from "@/services/subjects/stage.service";

export default async function ManagerSubjectsPage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const actorUserId = user?.id ?? null;
  const [subjects, stages] = await Promise.all([
    listSubjectsForManager(adminClient, actorUserId),
    listStagesForManager(adminClient, actorUserId),
  ]);

  return (
    <ManageSubjectsPanel initialSubjects={subjects} initialStages={stages} />
  );
}
