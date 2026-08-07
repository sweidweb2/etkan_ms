import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  FINANCIAL_ADJUSTMENT_TYPES,
  FINANCIAL_ADJUSTMENT_TYPE_LABELS,
  FINANCIAL_ADJUSTMENT_TYPE_VALUES,
  FINANCIAL_ADJUSTMENT_VALUE_TYPES,
  FINANCIAL_ADJUSTMENT_VALUE_TYPE_VALUES,
  PAYMENT_METHODS,
  PAYMENT_METHOD_VALUES,
  PAYMENT_PHASE_STATUSES,
  STUDENT_PAYMENT_PHASE_STATUSES,
  TRANSACTION_TYPES,
  TRANSACTION_TYPE_VALUES,
  type FinancialAdjustmentType,
  type FinancialAdjustmentValueType,
  type PaymentMethod,
  type StudentPaymentPhaseStatus,
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
import type { ManagerIncomeStatementAnalyticsData } from "@/types/manager-income-statement-analytics";
import type { Database } from "@/types/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

type Supabase = SupabaseClient<Database>;

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function yearFromDate(value: string): number | null {
  const year = Number(value.slice(0, 4));
  return Number.isFinite(year) ? year : null;
}

function monthFromDate(value: string): number | null {
  const month = Number(value.slice(5, 7));
  return month >= 1 && month <= 12 ? month : null;
}

function dayFromDate(value: string): number | null {
  const day = Number(value.slice(8, 10));
  return day >= 1 && day <= 31 ? day : null;
}

function inScope(
  date: string,
  year: number,
  month: number | null
): boolean {
  if (yearFromDate(date) !== year) {
    return false;
  }
  if (month === null) {
    return true;
  }
  return monthFromDate(date) === month;
}

function isPaymentMethod(value: string): value is PaymentMethod {
  return (PAYMENT_METHOD_VALUES as readonly string[]).includes(value);
}

function isTransactionType(value: string): value is TransactionType {
  return (TRANSACTION_TYPE_VALUES as readonly string[]).includes(value);
}

function isSppStatus(value: string): value is StudentPaymentPhaseStatus {
  return (
    value === STUDENT_PAYMENT_PHASE_STATUSES.PENDING ||
    value === STUDENT_PAYMENT_PHASE_STATUSES.PARTIALLY_PAID ||
    value === STUDENT_PAYMENT_PHASE_STATUSES.PAID ||
    value === STUDENT_PAYMENT_PHASE_STATUSES.CANCELLED
  );
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

export async function getIncomeStatementAnalyticsForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  input: {
    year?: number | null;
    /** Specific month 1–12, `null` for all months, omit to default to current month. */
    month?: number | null;
  } = {}
): Promise<ManagerIncomeStatementAnalyticsData> {
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

  const years = new Set<number>();
  for (const row of paymentRows) {
    const year = yearFromDate(row.payment_date);
    if (year) years.add(year);
  }
  for (const row of adjustmentRows) {
    const year = yearFromDate(row.effective_date);
    if (year) years.add(year);
  }
  for (const row of transactionRows) {
    const year = yearFromDate(row.transaction_date);
    if (year) years.add(year);
  }

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  years.add(currentYear);
  const availableYears = [...years].sort((a, b) => b - a);

  const year =
    input.year && availableYears.includes(input.year)
      ? input.year
      : (availableYears[0] ?? currentYear);

  // null = all months; undefined/missing input defaults to current month in that year
  const month =
    input.month === null
      ? null
      : input.month !== undefined &&
          input.month >= 1 &&
          input.month <= 12
        ? input.month
        : year === currentYear
          ? currentMonth
          : 1;

  const periodKeys =
    month === null
      ? MONTH_LABELS.map((_, index) => String(index + 1).padStart(2, "0"))
      : Array.from({ length: 31 }, (_, index) =>
          String(index + 1).padStart(2, "0")
        );

  const periodMap = new Map(
    periodKeys.map((key) => [
      key,
      {
        key,
        label:
          month === null
            ? MONTH_LABELS[Number(key) - 1]
            : String(Number(key)),
        payments: 0,
        credits: 0,
        debits: 0,
        adjustments: 0,
      },
    ])
  );

  let paymentsTotal = 0;
  let creditsTotal = 0;
  let debitsTotal = 0;
  let adjustmentsTotal = 0;

  const scopedPayments = paymentRows.filter((row) =>
    inScope(row.payment_date, year, month)
  );
  const scopedTransactions = transactionRows.filter((row) =>
    inScope(row.transaction_date, year, month)
  );

  for (const row of scopedPayments) {
    const amount = Number(row.amount);
    paymentsTotal += amount;
    const part =
      month === null
        ? monthFromDate(row.payment_date)
        : dayFromDate(row.payment_date);
    if (!part) continue;
    const bucket = periodMap.get(String(part).padStart(2, "0"));
    if (bucket) bucket.payments += amount;
  }

  for (const row of scopedTransactions) {
    const amount = Number(row.amount);
    const part =
      month === null
        ? monthFromDate(row.transaction_date)
        : dayFromDate(row.transaction_date);
    if (!part) continue;
    const bucket = periodMap.get(String(part).padStart(2, "0"));

    if (row.type === TRANSACTION_TYPES.CREDIT) {
      creditsTotal += amount;
      if (bucket) bucket.credits += amount;
    } else if (row.type === TRANSACTION_TYPES.DEBIT) {
      debitsTotal += amount;
      if (bucket) bucket.debits += amount;
    }
  }

  for (const row of adjustmentRows) {
    if (!inScope(row.effective_date, year, month)) continue;
    const amount = Number(row.value);
    adjustmentsTotal += amount;
    const part =
      month === null
        ? monthFromDate(row.effective_date)
        : dayFromDate(row.effective_date);
    if (!part) continue;
    const bucket = periodMap.get(String(part).padStart(2, "0"));
    if (bucket) bucket.adjustments += amount;
  }

  const daysInSelectedMonth =
    month === null ? null : new Date(year, month, 0).getDate();

  const periodSeries =
    month === null || daysInSelectedMonth === null
      ? [...periodMap.values()]
      : [...periodMap.values()].filter(
          (point) => Number(point.key) <= daysInSelectedMonth
        );

  const [allSppsResult, allPhasesResult] = await Promise.all([
    studentPaymentPhaseRepository.listAllSpps(adminClient),
    paymentPhaseRepository.listPaymentPhases(adminClient),
  ]);

  if (allSppsResult.error) {
    throw new Error(allSppsResult.error.message);
  }
  if (allPhasesResult.error) {
    throw new Error(allPhasesResult.error.message);
  }

  const allSpps = allSppsResult.data ?? [];
  const phaseById = new Map(
    (allPhasesResult.data ?? []).map((phase) => [
      phase.id,
      {
        name: phase.name,
        status: phase.status,
        amount: Number(phase.amount),
        duration_months: Number(phase.duration_months) || 1,
      },
    ])
  );
  const phaseNameById = new Map(
    [...phaseById.entries()].map(([id, phase]) => [id, phase.name])
  );
  const phaseStatusById = new Map(
    [...phaseById.entries()].map(([id, phase]) => [id, phase.status])
  );

  const sppById = new Map(allSpps.map((spp) => [spp.id, spp]));

  const studentIds = [...new Set(allSpps.map((spp) => spp.student_id))];
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

  const payments = scopedPayments.map((row) => {
    const spp = sppById.get(row.student_payment_phase_id);
    const studentId = spp?.student_id ?? "";
    const phaseId = spp?.payment_phase_id ?? "";

    return {
      id: row.id,
      student_id: studentId,
      payment_date: row.payment_date,
      amount: Number(row.amount),
      payment_method: isPaymentMethod(row.payment_method)
        ? row.payment_method
        : PAYMENT_METHODS.OTHER,
      received_by: row.received_by,
      student_label: labelByStudentId.get(studentId) || "—",
      payment_phase_name: phaseNameById.get(phaseId) ?? "—",
      notes: row.notes,
    };
  });

  const transactions = scopedTransactions.map((row) => ({
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

  const paidSppIdsInPeriod = new Set(
    scopedPayments.map((row) => row.student_payment_phase_id)
  );

  const unpaidStudents = allSpps
    .filter((spp) => {
      if (spp.status === STUDENT_PAYMENT_PHASE_STATUSES.CANCELLED) {
        return false;
      }
      if (Number(spp.remaining_amount) <= 0) {
        return false;
      }
      const phaseStatus = phaseStatusById.get(spp.payment_phase_id);
      if (
        phaseStatus === PAYMENT_PHASE_STATUSES.CANCELLED ||
        phaseStatus === PAYMENT_PHASE_STATUSES.CLOSED
      ) {
        return false;
      }
      return !paidSppIdsInPeriod.has(spp.id);
    })
    .map((spp) => ({
      spp_id: spp.id,
      student_id: spp.student_id,
      student_label: labelByStudentId.get(spp.student_id) || "—",
      payment_phase_name: phaseNameById.get(spp.payment_phase_id) ?? "—",
      status: isSppStatus(spp.status)
        ? spp.status
        : STUDENT_PAYMENT_PHASE_STATUSES.PENDING,
      remaining_amount: Number(spp.remaining_amount),
      final_amount_due: Number(spp.final_amount_due),
      total_paid: Number(spp.total_paid),
    }))
    .sort((a, b) => a.student_label.localeCompare(b.student_label));

  const paidThisPeriodBySppId = new Map<string, number>();
  for (const row of scopedPayments) {
    paidThisPeriodBySppId.set(
      row.student_payment_phase_id,
      (paidThisPeriodBySppId.get(row.student_payment_phase_id) ?? 0) +
        Number(row.amount)
    );
  }

  const adjustedStudents = adjustmentRows
    .map((row) => {
      const spp = sppById.get(row.student_payment_phase_id);
      if (!spp || spp.status === STUDENT_PAYMENT_PHASE_STATUSES.CANCELLED) {
        return null;
      }

      const type = isAdjustmentType(row.type)
        ? row.type
        : FINANCIAL_ADJUSTMENT_TYPES.MANUAL_ADJUSTMENT;
      const valueType = isAdjustmentValueType(row.value_type)
        ? row.value_type
        : FINANCIAL_ADJUSTMENT_VALUE_TYPES.FIXED;
      const value = Number(row.value);
      const phase = phaseById.get(spp.payment_phase_id);
      const monthlyPhaseAmount = phase
        ? phase.amount / Math.max(phase.duration_months, 1)
        : 0;
      const adjustmentAmount =
        valueType === FINANCIAL_ADJUSTMENT_VALUE_TYPES.PERCENTAGE
          ? (value / 100) * monthlyPhaseAmount
          : value;

      return {
        adjustment_id: row.id,
        spp_id: spp.id,
        student_id: spp.student_id,
        student_label: labelByStudentId.get(spp.student_id) || "—",
        payment_phase_name: phase?.name ?? "—",
        type,
        type_label: FINANCIAL_ADJUSTMENT_TYPE_LABELS[type],
        value_type: valueType,
        value,
        adjustment_amount: adjustmentAmount,
        final_amount_due: Number(spp.final_amount_due),
        paid_this_period: paidThisPeriodBySppId.get(spp.id) ?? 0,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort((a, b) => a.student_label.localeCompare(b.student_label));

  return {
    year,
    month,
    availableYears,
    periodSeries,
    composition: [
      { name: "Payments", value: paymentsTotal },
      { name: "Credits", value: creditsTotal },
      { name: "Debits", value: debitsTotal },
      { name: "Adjustments", value: adjustmentsTotal },
    ].filter((row) => row.value > 0),
    totals: {
      payments: paymentsTotal,
      credits: creditsTotal,
      debits: debitsTotal,
      adjustments: adjustmentsTotal,
    },
    payments,
    transactions,
    unpaidStudents,
    adjustedStudents,
  };
}
