import type { FieldErrors } from "@/types/auth";
import type { StudentStatusValue } from "@/lib/constants/manager-student-status";
import type {
  PaymentPhaseStatus,
  StudentPaymentPhaseStatus,
} from "@/lib/manager/accounting/constants";
import type { ManagerSppClearanceDto } from "@/types/manager-spp-clearance";

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
  /** First month of an opened phase that has an upfront amount. */
  upfront_window_active: boolean;
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

export type ManagerSppSemesterMismatchRow = {
  spp_id: string;
  student_id: string;
  student_profile_id: string | null;
  student_label: string;
  payment_phase_id: string;
  payment_phase_name: string;
  phase_semester_id: string;
  phase_semester_name: string;
  current_class_id: string;
  current_class_name: string;
  current_semester_id: string | null;
  current_semester_name: string;
};

/** Active (non-cancelled) SPP while student has no in-progress class membership. */
export type ManagerBilledWithoutClassRow = {
  spp_id: string;
  student_id: string;
  student_profile_id: string | null;
  student_label: string;
  student_status: StudentStatusValue | null;
  phone: string | null;
  payment_phase_id: string;
  payment_phase_name: string;
  phase_status: PaymentPhaseStatus;
  spp_status: StudentPaymentPhaseStatus;
  phase_semester_id: string;
  phase_semester_name: string;
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
  student_profile_id: string | null;
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
  /** Active Month paid overlay; null when missing or expired. */
  current_clearance: ManagerSppClearanceDto | null;
  /** Drop-semester overlays (display only). */
  drop_pending?: boolean;
  drop_dropped?: boolean;
  drop_done_paid?: boolean;
  drop_refund_owed?: boolean;
  drop_request_id?: string | null;
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

export type AssignOptionalEnrollPaymentPhasesActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  assignedCount?: number;
};

export type TransferSppActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  spp_id?: string;
  from_payment_phase_id?: string;
  to_payment_phase_id?: string;
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
