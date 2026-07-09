import { BORROW_EQUIPMENT_STATUSES } from "@/lib/constants/manager-borrow-equipment-status";
import {
  getDefaultStudentBorrowEquipmentPreview,
  MANAGER_STUDENT_BORROW_EQUIPMENT_MOCK,
} from "@/lib/constants/manager-student-borrow-equipment-mock";

function getAllBorrowRows() {
  const rows = getDefaultStudentBorrowEquipmentPreview();

  for (const userBorrows of Object.values(MANAGER_STUDENT_BORROW_EQUIPMENT_MOCK)) {
    rows.push(...userBorrows);
  }

  return rows;
}

export function getEquipmentBorrowedQuantityPreview(equipmentId: string): number {
  return getAllBorrowRows()
    .filter(
      (row) =>
        row.equipment_id === equipmentId &&
        row.status === BORROW_EQUIPMENT_STATUSES.BORROWED
    )
    .reduce((sum, row) => sum + row.quantity, 0);
}
