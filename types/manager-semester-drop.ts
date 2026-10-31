export type ManagerSemesterDropRequestRow = {
  id: string;
  student_id: string;
  semester_id: string;
  class_id: string;
  payment_phase_id: string | null;
  spp_id: string | null;
  status: string;
  required_percent: number;
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

export type ManagerSppDropOverlay = {
  pending: boolean;
  dropped: boolean;
  done_paid: boolean;
  refund_owed: boolean;
  request_id: string | null;
};
