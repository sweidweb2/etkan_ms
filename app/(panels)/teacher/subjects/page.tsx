import { TeacherSubjectsPanel } from "@/components/teacher/subjects/teacher-subjects-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listMySubjectsForTeacher } from "@/services/classes/teacher-class-self.service";

export default async function TeacherSubjectsPage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const rows = await listMySubjectsForTeacher(adminClient, user?.id ?? null);

  return <TeacherSubjectsPanel rows={rows} />;
}
