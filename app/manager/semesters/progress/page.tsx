import { SemesterProgressTrackPanel } from "@/components/manager/phases/semester-progress-track-panel";
import { getSessionRole } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listSemesterProgressForManager } from "@/services/semester.service";

export default async function ManagerSemesterProgressPage() {
  const adminClient = createSupabaseAdminClient();
  const role = await getSessionRole();
  const rows = await listSemesterProgressForManager(adminClient, role);

  return <SemesterProgressTrackPanel rows={rows} />;
}
