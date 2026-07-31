import type { FieldErrors } from "@/types/auth";
import type {
  PaymentMethod,
  PaymentPhaseStatus,
  StudentPaymentPhaseStatus,
} from "@/lib/manager/accounting/constants";

export type ManagerSppDetail = {
  id: string;
  student_id: string;
  student_label: string;
  payment_phase_id: string;
  payment_phase_name: string;
  payment_phase_status: PaymentPhaseStatus;
  semester_id: string;
  semester_name: string;
  semester_code: string;
  billing_class_id: string | null;
  billing_class_name: string | null;
  phase_amount: number;
  status: StudentPaymentPhaseStatus;
  original_amount: number;
  adjustment_amount: number;
  final_amount_due: number;
  total_paid: number;
  remaining_amount: number;
  has_credit: boolean;
  payments_blocked: boolean;
  assigned_at: string;
  created_at: string;
};

export type ManagerStudentPaymentRow = {
  id: string;
  student_payment_phase_id: string;
  payment_date: string;
  amount: number;
  payment_method: PaymentMethod;
  received_by: string;
  received_by_management: boolean;
  receipt_number: string | null;
  notes: string | null;
  created_at: string;
};

export type CreateStudentPaymentActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  payment?: ManagerStudentPaymentRow;
};

export type UpdateStudentPaymentActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  payment?: ManagerStudentPaymentRow;
};

export type DeleteStudentPaymentActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  student_payment_phase_id?: string;
  payment_phase_id?: string;
};
