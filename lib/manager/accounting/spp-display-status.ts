import {
  SPP_UPFRONT_PAID_DISPLAY_STATUS,
  type SppDisplayStatus,
} from "@/lib/constants/manager-payment-phase-display";
import {
  STUDENT_PAYMENT_PHASE_STATUSES,
  type StudentPaymentPhaseStatus,
} from "@/lib/manager/accounting/constants";

type SppDisplayInput = {
  status: StudentPaymentPhaseStatus;
  totalPaid: number;
};

type PhaseUpfrontContext = {
  upfrontWindowActive: boolean;
  upfrontAmount: number;
};

/**
 * Badge status for an SPP. Never persisted: while a phase is in its first month
 * with an upfront, students who covered the upfront read as "Upfront paid"
 * instead of "Partially paid".
 */
export function resolveSppDisplayStatus(
  spp: SppDisplayInput,
  { upfrontWindowActive, upfrontAmount }: PhaseUpfrontContext
): SppDisplayStatus {
  if (!upfrontWindowActive || upfrontAmount <= 0) {
    return spp.status;
  }

  if (
    spp.status === STUDENT_PAYMENT_PHASE_STATUSES.CANCELLED ||
    spp.status === STUDENT_PAYMENT_PHASE_STATUSES.PAID
  ) {
    return spp.status;
  }

  return spp.totalPaid >= upfrontAmount
    ? SPP_UPFRONT_PAID_DISPLAY_STATUS
    : spp.status;
}
