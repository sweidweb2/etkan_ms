import type { ManagerStudentBorrowEquipmentRow } from "@/types/manager-student-borrow-equipment";

/** borrow_equipment row with student display name for manager list views. */
export interface ManagerBorrowEquipmentListRow
  extends ManagerStudentBorrowEquipmentRow {
  student_name: string;
}
