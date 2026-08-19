import { ManageWorkshopsPanel } from "@/components/manager/workshops/manage-workshops-panel";
import { getSessionPack } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listWorkshopsForManager } from "@/services/workshops/workshop.service";

export default async function ManagerWorkshopsPage() {
  const adminClient = createSupabaseAdminClient();
  const pack = await getSessionPack();
  const workshops = await listWorkshopsForManager(
    adminClient,
    pack.user?.id ?? null,
    pack.role
  );

  return <ManageWorkshopsPanel initialWorkshops={workshops} />;
}
