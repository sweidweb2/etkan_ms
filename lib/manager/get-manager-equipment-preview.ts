import { MANAGER_EQUIPMENTS_MOCK } from "@/lib/constants/manager-equipments-mock";
import type { ManagerEquipmentRow } from "@/types/manager-equipment";

export function getManagerEquipmentPreview(
  equipmentId: string
): ManagerEquipmentRow {
  return (
    MANAGER_EQUIPMENTS_MOCK.find((equipment) => equipment.id === equipmentId) ??
    MANAGER_EQUIPMENTS_MOCK[0]
  );
}
