import { PERMISSIONS } from "@/lib/constants/permissions";
import { TRANSACTION_TYPES } from "@/lib/manager/accounting/constants";
import * as studentFinancialAdjustmentRepository from "@/repositories/student-financial-adjustment.repository";
import * as studentPaymentRepository from "@/repositories/student-payment.repository";
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

export async function getIncomeStatementAnalyticsForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  input: { year?: number | null; month?: number | null } = {}
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
  years.add(currentYear);
  const availableYears = [...years].sort((a, b) => b - a);

  const year =
    input.year && availableYears.includes(input.year)
      ? input.year
      : (availableYears[0] ?? currentYear);
  const month =
    input.month !== null &&
    input.month !== undefined &&
    input.month >= 1 &&
    input.month <= 12
      ? input.month
      : null;

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

  for (const row of paymentRows) {
    if (!inScope(row.payment_date, year, month)) continue;
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

  for (const row of transactionRows) {
    if (!inScope(row.transaction_date, year, month)) continue;
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
  };
}
