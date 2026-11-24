import { ManagePhasesPanel } from "@/components/manager/phases/manage-phases-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listSemestersForManager } from "@/services/classes/semester.service";
import { listSemesterTeamsForManager } from "@/services/classes/semester-team.service";

export default async function ManagerPhasesPage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const actorUserId = user?.id ?? null;
  const [semesters, teams] = await Promise.all([
    listSemestersForManager(adminClient, actorUserId),
    listSemesterTeamsForManager(adminClient, actorUserId),
  ]);

  return (
    <ManagePhasesPanel initialSemesters={semesters} initialTeams={teams} />
  );
}
