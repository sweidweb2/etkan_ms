import { TeacherClassesPanel } from "@/components/teacher/teacher-classes-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listTeachingClassesForSelf } from "@/services/classes/teacher-class-self.service";

export default async function TeacherClassesPage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const actorUserId = user?.id ?? null;

  const rows = await listTeachingClassesForSelf(adminClient, actorUserId);

  return <TeacherClassesPanel rows={rows} />;
}
