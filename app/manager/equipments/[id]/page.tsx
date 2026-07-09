import { notFound } from "next/navigation";
import { EquipmentDetailsPanel } from "@/components/manager/equipments/equipment-details-panel";
import { getSessionRole } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getEquipmentForManager } from "@/services/equipment.service";

type ManagerEquipmentDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ManagerEquipmentDetailPage({
  params,
}: ManagerEquipmentDetailPageProps) {
  const { id } = await params;
  const adminClient = createSupabaseAdminClient();
  const role = await getSessionRole();
  const equipment = await getEquipmentForManager(adminClient, role, id);

  if (!equipment) {
    notFound();
  }

  return <EquipmentDetailsPanel equipment={equipment} />;
}
