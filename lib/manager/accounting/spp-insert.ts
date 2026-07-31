import {
  STUDENT_PAYMENT_PHASE_STATUSES,
} from "@/lib/manager/accounting/constants";
import { computeSppFinancials } from "@/lib/manager/accounting/spp-financials";
import { deriveSppStatus } from "@/lib/manager/accounting/spp-status";
import type { CreateStudentPaymentPhaseRecordInput } from "@/repositories/student-payment-phase.repository";

/** Shared SPP insert payload for phase create, join sync, and missing-SPP repair. */
export function buildInitialSppInsert(
  studentId: string,
  paymentPhaseId: string,
  phaseAmount: number,
  assignedAt: string
): CreateStudentPaymentPhaseRecordInput {
  const financials = computeSppFinancials(phaseAmount, null, []);
  const status = deriveSppStatus(
    financials,
    STUDENT_PAYMENT_PHASE_STATUSES.PENDING
  );

  return {
    student_id: studentId,
    payment_phase_id: paymentPhaseId,
    assigned_at: assignedAt,
    status,
    original_amount: financials.original,
    adjustment_amount: financials.adjustmentAmount,
    final_amount_due: financials.finalDue,
    total_paid: financials.totalPaid,
    remaining_amount: financials.remaining,
  };
}
