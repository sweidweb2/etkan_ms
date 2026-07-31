import {
  STUDENT_PAYMENT_PHASE_STATUSES,
  type StudentPaymentPhaseStatus,
} from "@/lib/manager/accounting/constants";
import type { SppFinancials } from "@/lib/manager/accounting/spp-financials";

/**
 * Derive SPP status from financials. Cancelled is sticky.
 */
export function deriveSppStatus(
  financials: SppFinancials,
  currentStatus: StudentPaymentPhaseStatus
): StudentPaymentPhaseStatus {
  if (currentStatus === STUDENT_PAYMENT_PHASE_STATUSES.CANCELLED) {
    return STUDENT_PAYMENT_PHASE_STATUSES.CANCELLED;
  }

  if (financials.totalPaid <= 0 && financials.finalDue > 0) {
    return STUDENT_PAYMENT_PHASE_STATUSES.PENDING;
  }

  if (financials.remaining > 0) {
    return STUDENT_PAYMENT_PHASE_STATUSES.PARTIALLY_PAID;
  }

  return STUDENT_PAYMENT_PHASE_STATUSES.PAID;
}
