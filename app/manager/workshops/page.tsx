import { ManageWorkshopsPanel } from "@/components/manager/workshops/manage-workshops-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listWorkshopsForManager } from "@/services/workshop.service";

export default async function ManagerWorkshopsPage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const workshops = await listWorkshopsForManager(
    adminClient,
    user?.id ?? null
  );

  return <ManageWorkshopsPanel initialWorkshops={workshops} />;
}
