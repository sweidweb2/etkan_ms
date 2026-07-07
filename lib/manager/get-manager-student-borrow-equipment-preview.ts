import {
  getDefaultStudentBorrowEquipmentPreview,
  MANAGER_STUDENT_BORROW_EQUIPMENT_MOCK,
} from "@/lib/constants/manager-student-borrow-equipment-mock";
import type { ManagerStudentBorrowEquipmentRow } from "@/types/manager-student-borrow-equipment";

export function getManagerStudentBorrowEquipmentPreview(
  userId: string
): ManagerStudentBorrowEquipmentRow[] {
  const rows = MANAGER_STUDENT_BORROW_EQUIPMENT_MOCK[userId];
  if (!rows) {
    return getDefaultStudentBorrowEquipmentPreview().map((row) => ({
      ...row,
      user_id: userId,
    }));
  }

  return rows.map((row) => ({ ...row }));
}
