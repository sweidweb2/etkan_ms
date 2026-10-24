import { ManageStudentsPanel } from "@/components/manager/students/manage-students-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listStudentsPageForManager } from "@/services/students/student.service";

export default async function ManagerStudentsPage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const data = await listStudentsPageForManager(adminClient, user?.id ?? null, {
    page: 1,
  });

  return <ManageStudentsPanel initialData={data} />;
}
