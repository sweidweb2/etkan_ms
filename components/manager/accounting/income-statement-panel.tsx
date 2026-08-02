"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  BadgeDollarSignIcon,
  FileTextIcon,
  GraduationCapIcon,
  LineChartIcon,
  SlidersHorizontalIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { Can } from "@/components/auth/can";
import { CreateTransactionDialog } from "@/components/manager/accounting/create-transaction-dialog";
import { ClassTabCollapsibleSection } from "@/components/manager/students/class-tab-collapsible-section";
import { UserStatCard } from "@/components/manager/users/user-stat-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatPaymentPhaseMoney } from "@/lib/constants/manager-payment-phase-display";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { ROUTES } from "@/lib/constants/routes";
import {
  FINANCIAL_ADJUSTMENT_VALUE_TYPES,
  PAYMENT_METHOD_LABELS,
  TRANSACTION_TYPE_LABELS,
  TRANSACTION_TYPES,
  formatTransactionCategory,
  type FinancialAdjustmentValueType,
} from "@/lib/manager/accounting/constants";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import type { ManagerIncomeStatementData } from "@/types/manager-income-statement";

function formatAdjustmentValue(
  valueType: FinancialAdjustmentValueType,
  value: number
) {
  if (valueType === FINANCIAL_ADJUSTMENT_VALUE_TYPES.PERCENTAGE) {
    return `${value}%`;
  }
  return formatPaymentPhaseMoney(value);
}

type IncomeStatementPanelProps = {
  data: ManagerIncomeStatementData;
  defaultRecordedBy: string;
};

function TruncatedCell({
  value,
  maxLength,
  className,
}: {
  value: string;
  maxLength: number;
  className?: string;
}) {
  const { display, isTruncated } = truncateText(value, maxLength);

  if (!isTruncated) {
    return <span className={cn("block truncate", className)}>{display}</span>;
  }

  return (
    <span className={cn("block truncate", className)} title={value}>
      {display}
    </span>
  );
}

export function IncomeStatementPanel({
  data,
  defaultRecordedBy,
}: IncomeStatementPanelProps) {
  const { stats, adjustments, transactions } = data;
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Income statement
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Student payments, adjustments, and external credits/debits.
          </p>
        </div>
        <Link
          href={ROUTES.MANAGER_INCOME_STATEMENT_ANALYTICS}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          <LineChartIcon data-icon="inline-start" />
          Analytics
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <UserStatCard
          label="Total payments"
          value={formatPaymentPhaseMoney(stats.totalPaymentsAmount)}
          accentClassName="border-l-emerald-500"
        />
        <UserStatCard
          label="External credits"
          value={formatPaymentPhaseMoney(stats.totalCreditsAmount)}
          accentClassName="border-l-teal-500"
        />
        <UserStatCard
          label="External debits"
          value={formatPaymentPhaseMoney(stats.totalDebitsAmount)}
          accentClassName="border-l-rose-500"
        />
        <UserStatCard
          label="Total adjustments"
          value={formatPaymentPhaseMoney(stats.totalAdjustmentsValue)}
          accentClassName="border-l-amber-500"
        />
      </div>

      <ClassTabCollapsibleSection
        title="External transactions"
        description="Credits and debits outside student payment phases."
        defaultOpen
        action={
          <Can permission={PERMISSIONS.ACCOUNTING_TRANSACTIONS_CREATE}>
            <Button
              type="button"
              size="sm"
              onClick={(event) => {
                event.stopPropagation();
                setCreateOpen(true);
              }}
            >
              Add transaction
            </Button>
          </Can>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Recorded by</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    No external transactions recorded yet.
                  </td>
                </tr>
              ) : (
                transactions.map((row) => {
                  const isCredit = row.type === TRANSACTION_TYPES.CREDIT;
                  return (
                    <tr
                      key={row.id}
                      className="border-b last:border-b-0 hover:bg-muted/30"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {format(
                          new Date(`${row.transaction_date}T00:00:00`),
                          "MMM d, yyyy"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "font-medium",
                            isCredit ? "text-emerald-600" : "text-rose-600"
                          )}
                        >
                          {TRANSACTION_TYPE_LABELS[row.type]}
                        </span>
                      </td>
                      <td className="max-w-[16rem] px-4 py-3 font-medium">
                        <TruncatedCell
                          value={row.description}
                          maxLength={40}
                        />
                      </td>
                      <td className="max-w-[10rem] px-4 py-3 text-muted-foreground">
                        <TruncatedCell
                          value={formatTransactionCategory(row.category)}
                          maxLength={24}
                        />
                      </td>
                      <td
                        className={cn(
                          "whitespace-nowrap px-4 py-3 text-right tabular-nums font-medium",
                          isCredit ? "text-emerald-600" : "text-rose-600"
                        )}
                      >
                        {isCredit ? "+" : "−"}
                        {formatPaymentPhaseMoney(row.amount)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {row.payment_method
                          ? PAYMENT_METHOD_LABELS[row.payment_method]
                          : "—"}
                      </td>
                      <td className="max-w-[10rem] px-4 py-3 text-muted-foreground">
                        <TruncatedCell
                          value={row.recorded_by}
                          maxLength={24}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </ClassTabCollapsibleSection>

      <ClassTabCollapsibleSection
        title="Financial adjustments"
        description="Discounts, scholarships, and manual adjustments by student."
        defaultOpen
      >
        <div className="space-y-4 p-3 sm:p-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <div className="flex items-start gap-3 rounded-lg border px-3 py-2">
              <UsersIcon
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">People</p>
                <p className="text-lg font-semibold tabular-nums">
                  {stats.adjustmentPeopleCount}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border px-3 py-2">
              <FileTextIcon
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Records</p>
                <p className="text-lg font-semibold tabular-nums">
                  {stats.adjustmentCount}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border px-3 py-2">
              <GraduationCapIcon
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Scholarships</p>
                <p className="text-lg font-semibold tabular-nums">
                  {stats.scholarshipCount}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border px-3 py-2">
              <BadgeDollarSignIcon
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Scholarship total</p>
                <p className="text-lg font-semibold tabular-nums">
                  {formatPaymentPhaseMoney(stats.totalScholarshipAmount)}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border px-3 py-2">
              <SlidersHorizontalIcon
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Manual</p>
                <p className="text-lg font-semibold tabular-nums">
                  {stats.manualAdjustmentCount}
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Phase</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium text-right">Value</th>
                  <th className="px-4 py-3 font-medium">Effective</th>
                  <th className="px-4 py-3 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody>
                {adjustments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-muted-foreground"
                    >
                      No financial adjustments recorded yet.
                    </td>
                  </tr>
                ) : (
                  adjustments.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b last:border-b-0 hover:bg-muted/30"
                    >
                      <td className="max-w-[14rem] px-4 py-3 font-medium">
                        <TruncatedCell
                          value={row.student_label}
                          maxLength={32}
                        />
                      </td>
                      <td className="max-w-[12rem] px-4 py-3">
                        <TruncatedCell
                          value={row.payment_phase_name}
                          maxLength={28}
                        />
                      </td>
                      <td className="px-4 py-3">{row.type_label}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                        {formatAdjustmentValue(row.value_type, row.value)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {format(
                          new Date(`${row.effective_date}T00:00:00`),
                          "MMM d, yyyy"
                        )}
                      </td>
                      <td className="max-w-[14rem] px-4 py-3 text-muted-foreground">
                        {row.reason ? (
                          <TruncatedCell value={row.reason} maxLength={36} />
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </ClassTabCollapsibleSection>

      <CreateTransactionDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultRecordedBy={defaultRecordedBy}
      />
    </div>
  );
}
