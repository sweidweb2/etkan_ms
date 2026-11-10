import { ManageWorkshopsPanel } from "@/components/manager/workshops/manage-workshops-panel";
import { getSessionPack } from "@/lib/auth/session";
import { WORKSHOP_OFFERING_TYPES } from "@/lib/constants/manager-workshop-display";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listWorkshopsForManager } from "@/services/workshops/workshop.service";

export default async function ManagerWorkshopsPage() {
  const adminClient = createSupabaseAdminClient();
  const pack = await getSessionPack();
  const data = await listWorkshopsForManager(
    adminClient,
    pack.user?.id ?? null,
    pack.role,
    {
      page: 1,
      type: WORKSHOP_OFFERING_TYPES.WORKSHOP,
      showCompleted: true,
    }
  );

  return <ManageWorkshopsPanel initialData={data} />;
}
