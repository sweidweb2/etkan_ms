import { StudentClassesPanel } from "@/components/student/classes/student-classes-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listJoinedClassesForSelf } from "@/services/classes/student-class-self.service";

export default async function StudentClassesPage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const actorUserId = user?.id ?? null;

  const rows = await listJoinedClassesForSelf(adminClient, actorUserId);

  return <StudentClassesPanel rows={rows} />;
}
