import type { BorrowEquipmentStatusValue } from "@/lib/constants/manager-borrow-equipment-status";

/** borrow_equipment row for a single equipment with student display name. */
export interface ManagerEquipmentBorrowRow {
  id: string;
  equipment_id: string;
  user_id: string;
  student_name: string;
  quantity: number;
  borrowed_at: string;
  returned_at: string | null;
  status: BorrowEquipmentStatusValue;
}
