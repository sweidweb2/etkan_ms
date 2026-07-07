import type { BorrowEquipmentStatusValue } from "@/lib/constants/manager-borrow-equipment-status";

/** borrow_equipment row joined with equipments preview fields. */
export interface ManagerStudentBorrowEquipmentRow {
  id: string;
  equipment_id: string;
  user_id: string;
  equipment_name: string;
  equipment_description: string | null;
  equipment_unit_price: number;
  quantity: number;
  borrowed_at: string;
  returned_at: string | null;
  status: BorrowEquipmentStatusValue;
}
