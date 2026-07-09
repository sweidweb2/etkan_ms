import { EquipmentDetailsPanel } from "@/components/manager/equipments/equipment-details-panel";

type ManagerEquipmentDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ManagerEquipmentDetailPage({
  params,
}: ManagerEquipmentDetailPageProps) {
  const { id } = await params;

  return <EquipmentDetailsPanel equipmentId={id} />;
}
