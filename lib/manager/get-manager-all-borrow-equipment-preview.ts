import { MANAGER_STUDENTS_MOCK } from "@/lib/constants/manager-students-mock";
import {
  getDefaultStudentBorrowEquipmentPreview,
  MANAGER_STUDENT_BORROW_EQUIPMENT_MOCK,
} from "@/lib/constants/manager-student-borrow-equipment-mock";
import type { ManagerBorrowEquipmentListRow } from "@/types/manager-borrow-equipment-list";

function getStudentNameByUserId(userId: string): string {
  const student = MANAGER_STUDENTS_MOCK.find((row) => row.user_id === userId);
  if (student) {
    return student.full_name;
  }

  if (userId === "preview-user") {
    return "Preview student";
  }

  return "Unknown student";
}

export function getManagerAllBorrowEquipmentPreview(): ManagerBorrowEquipmentListRow[] {
  const rows: ManagerBorrowEquipmentListRow[] = [];

  for (const userBorrows of Object.values(MANAGER_STUDENT_BORROW_EQUIPMENT_MOCK)) {
    for (const row of userBorrows) {
      rows.push({
        ...row,
        student_name: getStudentNameByUserId(row.user_id),
      });
    }
  }

  for (const row of getDefaultStudentBorrowEquipmentPreview()) {
    rows.push({
      ...row,
      student_name: getStudentNameByUserId(row.user_id),
    });
  }

  return rows.sort(
    (left, right) =>
      new Date(right.borrowed_at).getTime() - new Date(left.borrowed_at).getTime()
  );
}
