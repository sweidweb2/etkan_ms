import { notFound } from "next/navigation";
import { EquipmentDetailsPanel } from "@/components/manager/equipments/equipment-details-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listEquipmentBorrowsForManager } from "@/services/equipment/borrow-equipment.service";
import { getEquipmentForManager } from "@/services/equipment/equipment.service";

type ManagerEquipmentDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ManagerEquipmentDetailPage({
  params,
}: ManagerEquipmentDetailPageProps) {
  const { id } = await params;
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const equipment = await getEquipmentForManager(adminClient, user?.id ?? null, id);

  if (!equipment) {
    notFound();
  }

  const borrows = await listEquipmentBorrowsForManager(
    adminClient, user?.id ?? null,
    id
  );

  return (
    <EquipmentDetailsPanel equipment={equipment} initialBorrows={borrows} />
  );
}
