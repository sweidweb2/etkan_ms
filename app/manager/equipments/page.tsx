import { ManageEquipmentsPanel } from "@/components/manager/equipments/manage-equipments-panel";
import { getSessionRole } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listEquipmentsForManager } from "@/services/equipment.service";

export default async function ManagerEquipmentsPage() {
  const adminClient = createSupabaseAdminClient();
  const role = await getSessionRole();
  const equipments = await listEquipmentsForManager(adminClient, role);

  return <ManageEquipmentsPanel initialEquipments={equipments} />;
}
