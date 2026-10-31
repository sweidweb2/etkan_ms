import {
  PAYMENT_PHASE_STATUSES,
  STUDENT_PAYMENT_PHASE_STATUSES,
  type PaymentPhaseStatus,
  type StudentPaymentPhaseStatus,
} from "@/lib/manager/accounting/constants";

export function isPaymentScheduleEditable(input: {
  spp_status: StudentPaymentPhaseStatus;
  payment_phase_status: PaymentPhaseStatus;
  drop_completed?: boolean;
}): boolean {
  if (input.drop_completed) {
    return false;
  }

  if (input.spp_status === STUDENT_PAYMENT_PHASE_STATUSES.CANCELLED) {
    return false;
  }

  if (input.spp_status === STUDENT_PAYMENT_PHASE_STATUSES.PAID) {
    return false;
  }

  if (
    input.payment_phase_status === PAYMENT_PHASE_STATUSES.CLOSED ||
    input.payment_phase_status === PAYMENT_PHASE_STATUSES.CANCELLED
  ) {
    return false;
  }

  return true;
}
