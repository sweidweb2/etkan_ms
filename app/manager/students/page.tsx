import { ManageStudentsPanel } from "@/components/manager/students/manage-students-panel";
import { getSessionRole } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listStudentsForManager } from "@/services/student.service";

export default async function ManagerStudentsPage() {
  const adminClient = createSupabaseAdminClient();
  const role = await getSessionRole();
  const students = await listStudentsForManager(adminClient, role);

  return <ManageStudentsPanel initialStudents={students} />;
}
