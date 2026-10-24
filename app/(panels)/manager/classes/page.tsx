import { ManageClassesPanel } from "@/components/manager/classes/manage-classes-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  listClassesPageForManager,
  listClassSemesterFilterOptionsForManager,
} from "@/services/classes/class.service";

export default async function ManagerClassesPage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const actorUserId = user?.id ?? null;

  const [initialData, semesterOptions] = await Promise.all([
    listClassesPageForManager(adminClient, actorUserId, { page: 1 }),
    listClassSemesterFilterOptionsForManager(adminClient, actorUserId),
  ]);

  return (
    <ManageClassesPanel
      initialData={initialData}
      semesterOptions={semesterOptions}
    />
  );
}
