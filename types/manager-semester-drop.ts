export type ManagerSemesterDropRequestRow = {
  id: string;
  student_id: string;
  semester_id: string;
  class_id: string;
  payment_phase_id: string | null;
  spp_id: string | null;
  status: string;
  restriction_mode: string;
  required_percent: number | null;
  required_amount: number;
  phase_amount_snapshot: number;
  requested_at: string;
  deadline_at: string;
  completed_at: string | null;
  refund_owed: number;
  refund_status: string;
  refunded_amount: number;
  remaining_refund: number;
  requested_by: string | null;
  notes: string | null;
};

export type ManagerNeedRefundRow = ManagerSemesterDropRequestRow & {
  student_label: string;
  phase_name: string | null;
};

/** Processed drop-refund debit payment shown in exceptions sidebar. */
export type ManagerDropRefundPaymentRow = {
  id: string;
  student_payment_phase_id: string;
  semester_drop_request_id: string;
  student_id: string;
  student_label: string;
  phase_name: string | null;
  payment_date: string;
  amount: number;
  payment_method: string;
  received_by: string;
  created_at: string;
};

export type DeleteDropRefundPaymentActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  deletedPaymentId?: string;
};

export type ManagerSppDropOverlay = {
  pending: boolean;
  dropped: boolean;
  done_paid: boolean;
  refund_owed: boolean;
  request_id: string | null;
};

export type ProcessDropRefundActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  request?: ManagerSemesterDropRequestRow;
};

export type WaiveDropRefundActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  request?: ManagerSemesterDropRequestRow;
};

export type CreateSemesterDropActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  completedImmediately?: boolean;
  removedStudentMembershipId?: string;
  membershipId?: string;
  requestId?: string;
};

export type CancelSemesterDropActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};
