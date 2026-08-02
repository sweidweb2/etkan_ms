import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  FINANCIAL_ADJUSTMENT_TYPES,
  FINANCIAL_ADJUSTMENT_TYPE_LABELS,
  FINANCIAL_ADJUSTMENT_TYPE_VALUES,
  FINANCIAL_ADJUSTMENT_VALUE_TYPES,
  FINANCIAL_ADJUSTMENT_VALUE_TYPE_VALUES,
  PAYMENT_METHOD_VALUES,
  TRANSACTION_TYPES,
  TRANSACTION_TYPE_VALUES,
  type FinancialAdjustmentType,
  type FinancialAdjustmentValueType,
  type PaymentMethod,
  type TransactionType,
} from "@/lib/manager/accounting/constants";
import * as paymentPhaseRepository from "@/repositories/payment-phase.repository";
import * as profileRepository from "@/repositories/profile.repository";
import * as studentFinancialAdjustmentRepository from "@/repositories/student-financial-adjustment.repository";
import * as studentPaymentRepository from "@/repositories/student-payment.repository";
import * as studentPaymentPhaseRepository from "@/repositories/student-payment-phase.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import * as transactionRepository from "@/repositories/transaction.repository";
import { assertPermission } from "@/services/authorization.service";
import type { ManagerIncomeStatementData } from "@/types/manager-income-statement";
import type { Database } from "@/types/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

type Supabase = SupabaseClient<Database>;

function isPaymentMethod(value: string): value is PaymentMethod {
  return (PAYMENT_METHOD_VALUES as readonly string[]).includes(value);
}

function isAdjustmentType(value: string): value is FinancialAdjustmentType {
  return (FINANCIAL_ADJUSTMENT_TYPE_VALUES as readonly string[]).includes(value);
}

function isAdjustmentValueType(
  value: string
): value is FinancialAdjustmentValueType {
  return (FINANCIAL_ADJUSTMENT_VALUE_TYPE_VALUES as readonly string[]).includes(
    value
  );
}

function isTransactionType(value: string): value is TransactionType {
  return (TRANSACTION_TYPE_VALUES as readonly string[]).includes(value);
}

export async function getIncomeStatementForManager(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerIncomeStatementData> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.ACCOUNTING_INCOME_STATEMENT_VIEW
  );

  const [paymentsResult, adjustmentsResult, transactionsResult] =
    await Promise.all([
      studentPaymentRepository.listAllPayments(adminClient),
      studentFinancialAdjustmentRepository.listAllFinancialAdjustments(
        adminClient
      ),
      transactionRepository.listAllTransactions(adminClient),
    ]);

  if (paymentsResult.error) {
    throw new Error(paymentsResult.error.message);
  }

  if (adjustmentsResult.error) {
    throw new Error(adjustmentsResult.error.message);
  }

  if (transactionsResult.error) {
    throw new Error(transactionsResult.error.message);
  }

  const paymentRows = paymentsResult.data ?? [];
  const adjustmentRows = adjustmentsResult.data ?? [];
  const transactionRows = transactionsResult.data ?? [];

  const sppIds = [
    ...new Set([
      ...paymentRows.map((row) => row.student_payment_phase_id),
      ...adjustmentRows.map((row) => row.student_payment_phase_id),
    ]),
  ];

  const { data: sppRecords, error: sppLoadError } =
    await studentPaymentPhaseRepository.listSppsByIds(adminClient, sppIds);

  if (sppLoadError) {
    throw new Error(sppLoadError.message);
  }

  const sppById = new Map<
    string,
    { student_id: string; payment_phase_id: string }
  >();
  const phaseIds = new Set<string>();

  for (const spp of sppRecords ?? []) {
    sppById.set(spp.id, {
      student_id: spp.student_id,
      payment_phase_id: spp.payment_phase_id,
    });
    phaseIds.add(spp.payment_phase_id);
  }

  const { data: phases, error: phaseError } =
    await paymentPhaseRepository.listPaymentPhaseAmountsByIds(adminClient, [
      ...phaseIds,
    ]);

  if (phaseError) {
    throw new Error(phaseError.message);
  }

  const phaseById = new Map(
    (phases ?? []).map((phase) => [
      phase.id,
      {
        name: phase.name,
        amount: Number(phase.amount),
        duration_months: Number(phase.duration_months) || 1,
        status: phase.status,
      },
    ])
  );

  const studentIds = [
    ...new Set([...sppById.values()].map((spp) => spp.student_id)),
  ];

  const labelByStudentId = new Map<string, string>();
  if (studentIds.length > 0) {
    const [{ data: profiles }, { data: studentProfiles }] = await Promise.all([
      profileRepository.listProfilesByIds(adminClient, studentIds),
      studentProfileRepository.listStudentProfilesByUserIds(
        adminClient,
        studentIds
      ),
    ]);

    const usernameById = new Map(
      (profiles ?? []).map((profile) => [profile.id, profile.username])
    );
    const fullNameByUserId = new Map(
      (studentProfiles ?? []).map((profile) => [
        profile.user_id,
        profile.full_name,
      ])
    );

    for (const studentId of studentIds) {
      const fullName = fullNameByUserId.get(studentId)?.trim();
      const username = usernameById.get(studentId)?.trim();
      labelByStudentId.set(studentId, fullName || username || studentId);
    }
  }

  const totalPaymentsAmount = paymentRows.reduce(
    (sum, row) => sum + Number(row.amount),
    0
  );

  const allAdjustmentPeople = new Set<string>();
  let scholarshipCount = 0;
  let discountCount = 0;
  let manualAdjustmentCount = 0;
  let totalScholarshipAmount = 0;
  let totalAdjustmentsValue = 0;

  const adjustments = adjustmentRows.map((row) => {
    const type = isAdjustmentType(row.type)
      ? row.type
      : FINANCIAL_ADJUSTMENT_TYPES.MANUAL_ADJUSTMENT;
    const valueType = isAdjustmentValueType(row.value_type)
      ? row.value_type
      : FINANCIAL_ADJUSTMENT_VALUE_TYPES.FIXED;
    const value = Number(row.value);
    const spp = sppById.get(row.student_payment_phase_id);
    const studentId = spp?.student_id ?? "";
    const phaseId = spp?.payment_phase_id ?? "";
    const phase = phaseById.get(phaseId);
    const monthlyPhaseAmount = phase
      ? phase.amount / Math.max(phase.duration_months, 1)
      : 0;

    // Fixed = dollar amount; percentage = share of (phase amount ÷ months).
    const amountInDollars =
      valueType === FINANCIAL_ADJUSTMENT_VALUE_TYPES.PERCENTAGE
        ? (value / 100) * monthlyPhaseAmount
        : value;

    if (spp?.student_id) {
      allAdjustmentPeople.add(spp.student_id);
    }

    totalAdjustmentsValue += amountInDollars;

    if (type === FINANCIAL_ADJUSTMENT_TYPES.SCHOLARSHIP) {
      scholarshipCount += 1;
      totalScholarshipAmount += amountInDollars;
    } else if (type === FINANCIAL_ADJUSTMENT_TYPES.DISCOUNT) {
      discountCount += 1;
    } else {
      manualAdjustmentCount += 1;
    }

    return {
      id: row.id,
      student_id: studentId,
      student_label: labelByStudentId.get(studentId) || "—",
      payment_phase_id: phaseId,
      payment_phase_name: phase?.name ?? "—",
      type,
      type_label: FINANCIAL_ADJUSTMENT_TYPE_LABELS[type],
      value_type: valueType,
      value,
      reason: row.reason,
      effective_date: row.effective_date,
    };
  });

  const transactions = transactionRows.map((row) => ({
    id: row.id,
    transaction_date: row.transaction_date,
    type: isTransactionType(row.type) ? row.type : TRANSACTION_TYPES.CREDIT,
    amount: Number(row.amount),
    description: row.description,
    category: row.category,
    payment_method:
      row.payment_method && isPaymentMethod(row.payment_method)
        ? row.payment_method
        : null,
    recorded_by: row.recorded_by,
    notes: row.notes,
  }));

  const totalCreditsAmount = transactions
    .filter((row) => row.type === TRANSACTION_TYPES.CREDIT)
    .reduce((sum, row) => sum + row.amount, 0);
  const totalDebitsAmount = transactions
    .filter((row) => row.type === TRANSACTION_TYPES.DEBIT)
    .reduce((sum, row) => sum + row.amount, 0);

  return {
    stats: {
      paymentCount: paymentRows.length,
      totalPaymentsAmount,
      totalScholarshipAmount,
      adjustmentPeopleCount: allAdjustmentPeople.size,
      adjustmentCount: adjustments.length,
      scholarshipCount,
      discountCount,
      manualAdjustmentCount,
      totalAdjustmentsValue,
      transactionCount: transactions.length,
      totalCreditsAmount,
      totalDebitsAmount,
    },
    adjustments,
    transactions,
  };
}
