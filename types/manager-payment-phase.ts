import type { FieldErrors } from "@/types/auth";
import type {
  PaymentPhaseStatus,
  StudentPaymentPhaseStatus,
} from "@/lib/manager/accounting/constants";

export type ManagerPaymentPhaseRow = {
  id: string;
  name: string;
  semester_id: string;
  semester_name: string;
  semester_code: string;
  billing_class_id: string | null;
  billing_class_name: string | null;
  status: PaymentPhaseStatus;
  amount: number;
  upfront_amount: number;
  duration_months: number;
  start_date: string;
  end_date: string;
  created_at: string;
  spp_active_count: number;
  spp_paid_count: number;
};

export type ManagerMissingSppRow = {
  student_id: string;
  student_label: string;
  semester_id: string;
  semester_name: string;
  billing_class_id: string;
  billing_class_name: string;
  payment_phase_id: string;
  payment_phase_name: string;
};

export type ManagerPaymentPhaseSemesterOption = {
  id: string;
  name: string;
  semester_code: string;
  label: string;
};

export type ManagerSppRow = {
  id: string;
  student_id: string;
  student_label: string;
  payment_phase_id: string;
  status: StudentPaymentPhaseStatus;
  original_amount: number;
  adjustment_amount: number;
  final_amount_due: number;
  total_paid: number;
  remaining_amount: number;
  assigned_at: string;
  created_at: string;
};

export type CreatePaymentPhaseActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  phase?: ManagerPaymentPhaseRow;
};

export type RepairMissingSppActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
};

export type UpdatePaymentPhaseActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  phase?: ManagerPaymentPhaseRow;
};

export type CancelPaymentPhaseActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  phase?: ManagerPaymentPhaseRow;
};

export type { PaymentPhaseStatus, StudentPaymentPhaseStatus };
