import { ManageAccountingPanel } from "@/components/manager/accounting/manage-accounting-panel";
import { getSessionRole } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  listAccountingSemesterOptionsForManager,
  listAccountingStudentsForManager,
} from "@/services/accounting.service";

export default async function ManagerAccountingPage() {
  const adminClient = createSupabaseAdminClient();
  const role = await getSessionRole();

  const [students, semesterOptions] = await Promise.all([
    listAccountingStudentsForManager(adminClient, role),
    listAccountingSemesterOptionsForManager(adminClient, role),
  ]);

  return (
    <ManageAccountingPanel
      initialStudents={students}
      initialSemesterOptions={semesterOptions}
    />
  );
}
