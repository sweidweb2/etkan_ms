import type { FieldErrors } from "@/types/auth";
import type { PaymentScheduleStatus } from "@/lib/manager/accounting/constants";

export type ManagerStudentPaymentScheduleRow = {
  id: string;
  student_payment_phase_id: string;
  due_date: string;
  amount: number;
  label: string;
  status: PaymentScheduleStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  is_overdue: boolean;
};

export type CreateStudentPaymentScheduleActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  schedule?: ManagerStudentPaymentScheduleRow;
};

export type UpdateStudentPaymentScheduleActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  schedule?: ManagerStudentPaymentScheduleRow;
};

export type DeleteStudentPaymentScheduleActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  student_payment_phase_id?: string;
};
