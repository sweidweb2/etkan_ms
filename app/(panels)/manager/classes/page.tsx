import { ManageClassesPanel } from "@/components/manager/classes/manage-classes-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listClassesPageForManager } from "@/services/classes/class.service";

export default async function ManagerClassesPage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const actorUserId = user?.id ?? null;

  const initialData = await listClassesPageForManager(
    adminClient,
    actorUserId,
    { page: 1, pageSize: 40 }
  );

  return <ManageClassesPanel initialData={initialData} />;
}
