import { ManageEquipmentsPanel } from "@/components/manager/equipments/manage-equipments-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listEquipmentsForManager } from "@/services/equipment.service";

export default async function ManagerEquipmentsPage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const equipments = await listEquipmentsForManager(adminClient, user?.id ?? null);

  return <ManageEquipmentsPanel initialEquipments={equipments} />;
}
