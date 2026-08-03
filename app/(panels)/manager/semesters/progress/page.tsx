import { SemesterProgressTrackPanel } from "@/components/manager/phases/semester-progress-track-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listSemesterProgressForManager } from "@/services/semester.service";

export default async function ManagerSemesterProgressPage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const rows = await listSemesterProgressForManager(adminClient, user?.id ?? null);

  return <SemesterProgressTrackPanel rows={rows} />;
}
