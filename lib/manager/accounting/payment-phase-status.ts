import {
  PAYMENT_PHASE_STATUSES,
  STUDENT_PAYMENT_PHASE_STATUSES,
  type PaymentPhaseStatus,
  type StudentPaymentPhaseStatus,
} from "@/lib/manager/accounting/constants";

/**
 * Derive payment phase status from active (non-cancelled) SPP statuses.
 * Cancelled phase is sticky. Empty active set stays opened (v1).
 */
export function derivePaymentPhaseStatus(
  phaseStatus: PaymentPhaseStatus,
  sppStatuses: StudentPaymentPhaseStatus[]
): PaymentPhaseStatus {
  if (phaseStatus === PAYMENT_PHASE_STATUSES.CANCELLED) {
    return PAYMENT_PHASE_STATUSES.CANCELLED;
  }

  const active = sppStatuses.filter(
    (status) => status !== STUDENT_PAYMENT_PHASE_STATUSES.CANCELLED
  );

  if (active.length === 0) {
    return PAYMENT_PHASE_STATUSES.OPENED;
  }

  if (active.every((status) => status === STUDENT_PAYMENT_PHASE_STATUSES.PAID)) {
    return PAYMENT_PHASE_STATUSES.CLOSED;
  }

  return PAYMENT_PHASE_STATUSES.OPENED;
}
