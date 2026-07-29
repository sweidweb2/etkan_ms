import { ManageStudentsPanel } from "@/components/manager/students/manage-students-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listStudentsForManager } from "@/services/student.service";

export default async function ManagerStudentsPage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const students = await listStudentsForManager(adminClient, user?.id ?? null);

  return <ManageStudentsPanel initialStudents={students} />;
}
