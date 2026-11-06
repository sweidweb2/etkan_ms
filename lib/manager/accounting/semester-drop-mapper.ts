import type {
  ManagerNeedRefundRow,
  ManagerSemesterDropRequestRow,
} from "@/types/manager-semester-drop";

/** Minimal drop-request shape after repository numeric coercion. */
export type SemesterDropRequestLike = {
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
  requested_by: string | null;
  notes: string | null;
};

export function remainingDropRefund(
  refundOwed: number,
  refundedAmount: number
): number {
  return Math.max(0, Number(refundOwed) - Number(refundedAmount));
}

export function toManagerSemesterDropRow(
  row: SemesterDropRequestLike
): ManagerSemesterDropRequestRow {
  return {
    id: row.id,
    student_id: row.student_id,
    semester_id: row.semester_id,
    class_id: row.class_id,
    payment_phase_id: row.payment_phase_id,
    spp_id: row.spp_id,
    status: row.status,
    required_percent: row.required_percent,
    required_amount: row.required_amount,
    phase_amount_snapshot: row.phase_amount_snapshot,
    requested_at: row.requested_at,
    deadline_at: row.deadline_at,
    completed_at: row.completed_at,
    refund_owed: row.refund_owed,
    refund_status: row.refund_status,
    refunded_amount: row.refunded_amount,
    remaining_refund: remainingDropRefund(
      row.refund_owed,
      row.refunded_amount
    ),
    requested_by: row.requested_by,
    notes: row.notes,
  };
}

export function toManagerNeedRefundRow(
  row: SemesterDropRequestLike,
  meta: { student_label: string; phase_name: string | null }
): ManagerNeedRefundRow {
  return {
    ...toManagerSemesterDropRow(row),
    student_label: meta.student_label,
    phase_name: meta.phase_name,
  };
}
