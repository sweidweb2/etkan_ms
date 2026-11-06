import {
  PAYMENT_PHASE_STATUSES,
  SEMESTER_DROP_REFUND_STATUSES,
  SEMESTER_DROP_REQUEST_STATUSES,
  STUDENT_PAYMENT_PHASE_STATUSES,
} from "@/lib/manager/accounting/constants";
import type { ManagerSppDropOverlay } from "@/types/manager-semester-drop";

export function isPendingDropStatus(status: string): boolean {
  return status === SEMESTER_DROP_REQUEST_STATUSES.PENDING;
}

export function isCompletedDropStatus(status: string): boolean {
  return status === SEMESTER_DROP_REQUEST_STATUSES.COMPLETED;
}

/**
 * SPP mutation locks. Mirrors SQL `internal_assert_spp_*` in
 * `20261031160000_drop_adjusted_required_and_spp_locks.sql`.
 */
export function deriveSppLocks(input: {
  phaseStatus: string | null | undefined;
  sppStatus: string | null | undefined;
  dropCompleted: boolean;
}): {
  payments_blocked: boolean;
  adjustments_blocked: boolean;
  schedule_editable: boolean;
} {
  const phaseCancelled = input.phaseStatus === PAYMENT_PHASE_STATUSES.CANCELLED;
  const sppCancelled =
    input.sppStatus === STUDENT_PAYMENT_PHASE_STATUSES.CANCELLED;
  const sppPaid = input.sppStatus === STUDENT_PAYMENT_PHASE_STATUSES.PAID;
  const phaseClosedOrCancelled =
    input.phaseStatus === PAYMENT_PHASE_STATUSES.CLOSED || phaseCancelled;

  const payments_blocked =
    phaseCancelled || sppCancelled || sppPaid || input.dropCompleted;
  const adjustments_blocked =
    phaseCancelled || sppCancelled || input.dropCompleted;
  const schedule_editable =
    !input.dropCompleted &&
    !sppCancelled &&
    !sppPaid &&
    !phaseClosedOrCancelled;

  return { payments_blocked, adjustments_blocked, schedule_editable };
}

/**
 * Display overlay for a phase SPP row.
 * `done_paid` = completed drop, left class, and refund not still owed.
 */
export function deriveDropOverlay(
  drop: {
    status: string;
    refund_status: string;
    id: string;
  } | null,
  isMember: boolean
): ManagerSppDropOverlay {
  if (!drop) {
    return {
      pending: false,
      dropped: false,
      done_paid: false,
      refund_owed: false,
      request_id: null,
    };
  }

  const pending = isPendingDropStatus(drop.status);
  const completed = isCompletedDropStatus(drop.status);
  const dropped = completed && !isMember;
  const refundOwed =
    completed && drop.refund_status === SEMESTER_DROP_REFUND_STATUSES.OWED;

  return {
    pending,
    dropped,
    done_paid: dropped && !refundOwed,
    refund_owed: refundOwed,
    request_id: drop.id,
  };
}

export function applyDropOverlayToSppFlags(overlay: ManagerSppDropOverlay): {
  drop_pending: boolean;
  drop_dropped: boolean;
  drop_done_paid: boolean;
  drop_refund_owed: boolean;
  drop_request_id: string | null;
} {
  return {
    drop_pending: overlay.pending,
    drop_dropped: overlay.dropped,
    drop_done_paid: overlay.done_paid,
    drop_refund_owed: overlay.refund_owed,
    drop_request_id: overlay.request_id,
  };
}
