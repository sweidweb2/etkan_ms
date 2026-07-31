import {
  FINANCIAL_ADJUSTMENT_VALUE_TYPES,
  PAYMENT_PHASE_STATUSES,
  STUDENT_PAYMENT_PHASE_STATUSES,
  type FinancialAdjustmentValueType,
  type PaymentPhaseStatus,
  type StudentPaymentPhaseStatus,
} from "@/lib/manager/accounting/constants";
import { derivePaymentPhaseStatus } from "@/lib/manager/accounting/payment-phase-status";
import {
  computeSppFinancials,
  type SppAdjustmentInput,
} from "@/lib/manager/accounting/spp-financials";
import { deriveSppStatus } from "@/lib/manager/accounting/spp-status";
import * as paymentPhaseRepository from "@/repositories/payment-phase.repository";
import * as studentFinancialAdjustmentRepository from "@/repositories/student-financial-adjustment.repository";
import type { StudentPaymentPhaseRecord } from "@/repositories/student-payment-phase.repository";
import * as studentPaymentPhaseRepository from "@/repositories/student-payment-phase.repository";
import * as studentPaymentRepository from "@/repositories/student-payment.repository";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

function isPaymentPhaseStatus(value: string): value is PaymentPhaseStatus {
  return (
    value === PAYMENT_PHASE_STATUSES.OPENED ||
    value === PAYMENT_PHASE_STATUSES.CLOSED ||
    value === PAYMENT_PHASE_STATUSES.CANCELLED
  );
}

function isStudentPaymentPhaseStatus(
  value: string
): value is StudentPaymentPhaseStatus {
  return (
    value === STUDENT_PAYMENT_PHASE_STATUSES.PENDING ||
    value === STUDENT_PAYMENT_PHASE_STATUSES.PARTIALLY_PAID ||
    value === STUDENT_PAYMENT_PHASE_STATUSES.PAID ||
    value === STUDENT_PAYMENT_PHASE_STATUSES.CANCELLED
  );
}

function isAdjustmentValueType(
  value: string
): value is FinancialAdjustmentValueType {
  return (
    value === FINANCIAL_ADJUSTMENT_VALUE_TYPES.FIXED ||
    value === FINANCIAL_ADJUSTMENT_VALUE_TYPES.PERCENTAGE
  );
}

async function loadAdjustmentAndPaymentsForSppIds(
  adminClient: Supabase,
  sppIds: string[]
): Promise<{
  paymentAmountsBySppId: Map<string, number[]>;
  adjustmentBySppId: Map<string, SppAdjustmentInput>;
}> {
  const [
    { data: payments, error: paymentsError },
    { data: adjustments, error: adjustmentsError },
  ] = await Promise.all([
    studentPaymentRepository.listPaymentAmountsBySppIds(adminClient, sppIds),
    studentFinancialAdjustmentRepository.listAdjustmentsBySppIds(
      adminClient,
      sppIds
    ),
  ]);

  if (paymentsError) {
    throw new Error(paymentsError.message);
  }

  if (adjustmentsError) {
    throw new Error(adjustmentsError.message);
  }

  const paymentAmountsBySppId = new Map<string, number[]>();
  for (const payment of payments ?? []) {
    const list =
      paymentAmountsBySppId.get(payment.student_payment_phase_id) ?? [];
    list.push(Number(payment.amount));
    paymentAmountsBySppId.set(payment.student_payment_phase_id, list);
  }

  const adjustmentBySppId = new Map<string, SppAdjustmentInput>();
  for (const adjustment of adjustments ?? []) {
    if (!isAdjustmentValueType(adjustment.value_type)) {
      continue;
    }
    adjustmentBySppId.set(adjustment.student_payment_phase_id, {
      value_type: adjustment.value_type,
      value: Number(adjustment.value),
    });
  }

  return { paymentAmountsBySppId, adjustmentBySppId };
}

/**
 * Recalculate every non-cancelled SPP for a phase using the given phase amount,
 * then derive the next phase status.
 */
export async function recalcNonCancelledSppsForPhase(
  adminClient: Supabase,
  phaseAmount: number,
  phaseStatus: PaymentPhaseStatus,
  spps: StudentPaymentPhaseRecord[]
): Promise<{ sppRecalculated: number; nextPhaseStatus: PaymentPhaseStatus }> {
  const nonCancelled = spps.filter(
    (spp) => spp.status !== STUDENT_PAYMENT_PHASE_STATUSES.CANCELLED
  );
  const cancelledStatuses = spps
    .filter((spp) => spp.status === STUDENT_PAYMENT_PHASE_STATUSES.CANCELLED)
    .map(() => STUDENT_PAYMENT_PHASE_STATUSES.CANCELLED);

  const sppIds = nonCancelled.map((spp) => spp.id);
  const { paymentAmountsBySppId, adjustmentBySppId } =
    await loadAdjustmentAndPaymentsForSppIds(adminClient, sppIds);

  const derivedStatuses: StudentPaymentPhaseStatus[] = [...cancelledStatuses];
  let sppRecalculated = 0;

  for (const spp of nonCancelled) {
    const currentStatus = isStudentPaymentPhaseStatus(spp.status)
      ? spp.status
      : STUDENT_PAYMENT_PHASE_STATUSES.PENDING;
    const financials = computeSppFinancials(
      phaseAmount,
      adjustmentBySppId.get(spp.id) ?? null,
      paymentAmountsBySppId.get(spp.id) ?? []
    );
    const nextStatus = deriveSppStatus(financials, currentStatus);

    const { error: updateError } =
      await studentPaymentPhaseRepository.updateStudentPaymentPhaseFinancials(
        adminClient,
        spp.id,
        {
          status: nextStatus,
          original_amount: financials.original,
          adjustment_amount: financials.adjustmentAmount,
          final_amount_due: financials.finalDue,
          total_paid: financials.totalPaid,
          remaining_amount: financials.remaining,
        }
      );

    if (updateError) {
      throw new Error(updateError.message);
    }

    derivedStatuses.push(nextStatus);
    sppRecalculated += 1;
  }

  return {
    sppRecalculated,
    nextPhaseStatus: derivePaymentPhaseStatus(phaseStatus, derivedStatuses),
  };
}

/**
 * Recalculate a single SPP from live phase amount, adjustment, and payments.
 */
export async function recalcSingleSpp(
  adminClient: Supabase,
  sppId: string
): Promise<StudentPaymentPhaseRecord> {
  const { data: spp, error: sppError } =
    await studentPaymentPhaseRepository.findSppById(adminClient, sppId);

  if (sppError) {
    throw new Error(sppError.message);
  }

  if (!spp) {
    throw new Error("Student payment phase not found.");
  }

  if (spp.status === STUDENT_PAYMENT_PHASE_STATUSES.CANCELLED) {
    return spp as StudentPaymentPhaseRecord;
  }

  const { data: phase, error: phaseError } =
    await paymentPhaseRepository.findPaymentPhaseById(
      adminClient,
      spp.payment_phase_id
    );

  if (phaseError) {
    throw new Error(phaseError.message);
  }

  if (!phase) {
    throw new Error("Payment phase not found.");
  }

  const { paymentAmountsBySppId, adjustmentBySppId } =
    await loadAdjustmentAndPaymentsForSppIds(adminClient, [spp.id]);

  const currentStatus = isStudentPaymentPhaseStatus(spp.status)
    ? spp.status
    : STUDENT_PAYMENT_PHASE_STATUSES.PENDING;
  const financials = computeSppFinancials(
    Number(phase.amount),
    adjustmentBySppId.get(spp.id) ?? null,
    paymentAmountsBySppId.get(spp.id) ?? []
  );
  const nextStatus = deriveSppStatus(financials, currentStatus);

  const { data: updated, error: updateError } =
    await studentPaymentPhaseRepository.updateStudentPaymentPhaseFinancials(
      adminClient,
      spp.id,
      {
        status: nextStatus,
        original_amount: financials.original,
        adjustment_amount: financials.adjustmentAmount,
        final_amount_due: financials.finalDue,
        total_paid: financials.totalPaid,
        remaining_amount: financials.remaining,
      }
    );

  if (updateError || !updated) {
    throw new Error(updateError?.message ?? "Unable to recalculate SPP.");
  }

  return updated as StudentPaymentPhaseRecord;
}

/**
 * Recompute payment phase status from all SPP statuses (never un-cancels).
 */
export async function recalcPhaseStatusFromSpps(
  adminClient: Supabase,
  phaseId: string
): Promise<PaymentPhaseStatus> {
  const { data: phase, error: phaseError } =
    await paymentPhaseRepository.findPaymentPhaseById(adminClient, phaseId);

  if (phaseError) {
    throw new Error(phaseError.message);
  }

  if (!phase) {
    throw new Error("Payment phase not found.");
  }

  const currentStatus = isPaymentPhaseStatus(phase.status)
    ? phase.status
    : PAYMENT_PHASE_STATUSES.OPENED;

  if (currentStatus === PAYMENT_PHASE_STATUSES.CANCELLED) {
    return currentStatus;
  }

  const { data: spps, error: sppError } =
    await studentPaymentPhaseRepository.listSppsByPaymentPhaseId(
      adminClient,
      phaseId
    );

  if (sppError) {
    throw new Error(sppError.message);
  }

  const statuses = ((spps ?? []) as StudentPaymentPhaseRecord[]).map((spp) =>
    isStudentPaymentPhaseStatus(spp.status)
      ? spp.status
      : STUDENT_PAYMENT_PHASE_STATUSES.PENDING
  );

  const nextStatus = derivePaymentPhaseStatus(currentStatus, statuses);

  if (nextStatus === currentStatus) {
    return currentStatus;
  }

  const { error: statusError } =
    await paymentPhaseRepository.updatePaymentPhaseStatus(
      adminClient,
      phaseId,
      nextStatus
    );

  if (statusError) {
    throw new Error(statusError.message);
  }

  return nextStatus;
}

/**
 * Recalculate one SPP then its parent phase status.
 */
export async function recalcSppAndPhaseStatus(
  adminClient: Supabase,
  sppId: string
): Promise<{
  spp: StudentPaymentPhaseRecord;
  phaseStatus: PaymentPhaseStatus;
}> {
  const spp = await recalcSingleSpp(adminClient, sppId);
  const phaseStatus = await recalcPhaseStatusFromSpps(
    adminClient,
    spp.payment_phase_id
  );
  return { spp, phaseStatus };
}
