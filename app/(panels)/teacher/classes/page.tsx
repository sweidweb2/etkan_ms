import { TeacherClassesPanel } from "@/components/teacher/classes/teacher-classes-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listMyClassesForTeacher } from "@/services/classes/teacher-class-self.service";

export default async function TeacherClassesPage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const actorUserId = user?.id ?? null;

  const rows = await listMyClassesForTeacher(adminClient, actorUserId);

  return <TeacherClassesPanel rows={rows} />;
}
