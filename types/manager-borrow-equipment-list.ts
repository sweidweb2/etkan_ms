import type { ManagerStudentBorrowEquipmentRow } from "@/types/manager-student-borrow-equipment";
import type { FieldErrors } from "@/types/auth";

/** borrow_equipment row with student display name for manager list views. */
export interface ManagerBorrowEquipmentListRow
  extends ManagerStudentBorrowEquipmentRow {
  student_name: string;
}

export type ManagerBorrowClassOption = {
  id: string;
  name: string;
};

export type CreateBorrowsActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  createdCount?: number;
};

export type UpdateBorrowRecordActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
};

export type ToggleBorrowReturnedActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
};
