"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  BadgeDollarSignIcon,
  CalendarDaysIcon,
  FileTextIcon,
  GraduationCapIcon,
  LineChartIcon,
  SlidersHorizontalIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react";
import Link from "next/link";
import {
  Tabs as TabsPrimitive,
  TabsContent as TabsContentPrimitive,
  TabsContents as TabsContentsPrimitive,
  TabsList as TabsListPrimitive,
  TabsTrigger as TabsTriggerPrimitive,
} from "@/components/animate-ui/primitives/animate/tabs";
import { Can } from "@/components/auth/can";
import { usePermissions } from "@/components/auth/permissions-provider";
import { CreateTransactionDialog } from "@/components/manager/accounting/create-transaction-dialog";
import { ExternalTransactionRowActions } from "@/components/manager/accounting/external-transaction-row-actions";
import {
  IncomeTablePagination,
  usePagedRows,
} from "@/components/manager/accounting/income-table-paging";
import { ClassTabCollapsibleSection } from "@/components/manager/students/class-tab-collapsible-section";
import { UserStatCard } from "@/components/manager/users/user-stat-card";
import { PanelPageHeader } from "@/components/panels/panel-page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useExternalTransactionDialogs } from "@/hooks/use-external-transaction-dialogs";
import { hasPermissionInSet } from "@/lib/auth/permission-checks";
import { formatPaymentPhaseMoney } from "@/lib/constants/manager-payment-phase-display";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { ROUTES } from "@/lib/constants/routes";
import {
  FINANCIAL_ADJUSTMENT_VALUE_TYPES,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  TRANSACTION_TYPE_LABELS,
  TRANSACTION_TYPES,
  formatTransactionCategory,
  type FinancialAdjustmentValueType,
  type PaymentMethod,
} from "@/lib/manager/accounting/constants";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import type {
  ManagerIncomeStatementData,
  ManagerIncomeTransactionRow,
} from "@/types/manager-income-statement";

const STATEMENT_TABS = {
  TRANSACTIONS: "transactions",
  ADJUSTMENTS: "adjustments",
} as const;

const METHOD_FILTER_ALL = "all";

const METHOD_FILTERS = [
  { value: METHOD_FILTER_ALL, label: "All" },
  { value: PAYMENT_METHODS.CASH, label: PAYMENT_METHOD_LABELS.cash },
  { value: PAYMENT_METHODS.WHISH, label: PAYMENT_METHOD_LABELS.whish },
] as const;

type MethodFilterValue = (typeof METHOD_FILTERS)[number]["value"];

const TAB_TRIGGER_CLASS = cn(
  "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 sm:px-4 sm:text-sm",
  "border-transparent text-muted-foreground hover:border-border/60 hover:bg-background/80 hover:text-foreground hover:shadow-sm",
  "data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md",
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
);

function formatAdjustmentValue(
  valueType: FinancialAdjustmentValueType,
  value: number
) {
  if (valueType === FINANCIAL_ADJUSTMENT_VALUE_TYPES.PERCENTAGE) {
    return `${value}%`;
  }
  return formatPaymentPhaseMoney(value);
}

/** Credits minus debits for one payment method. */
function netAmountForMethod(
  rows: readonly ManagerIncomeTransactionRow[],
  method: PaymentMethod
) {
  return rows.reduce((sum, row) => {
    if (row.payment_method !== method) return sum;
    return row.type === TRANSACTION_TYPES.CREDIT
      ? sum + row.amount
      : sum - row.amount;
  }, 0);
}

type IncomeStatementPanelProps = {
  data: ManagerIncomeStatementData;
  /** Shown in empty states, e.g. "August 2026". */
  periodLabel?: string;
  /** When true, hide create/edit transaction actions. */
  readOnly?: boolean;
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

function CountBadge({ count }: { count: number }) {
  return (
    <span className="ml-1.5 rounded-md bg-muted px-1.5 py-0.5 text-[11px] tabular-nums text-muted-foreground">
      {count}
    </span>
  );
}

export function IncomeStatementPanel({
  data,
  periodLabel,
  readOnly = false,
}: IncomeStatementPanelProps) {
  const { stats, adjustments } = data;
  const [transactions, setTransactions] = useState(data.transactions);
  const [prevTransactions, setPrevTransactions] = useState(data.transactions);
  if (data.transactions !== prevTransactions) {
    setPrevTransactions(data.transactions);
    setTransactions(data.transactions);
  }
  const permissions = usePermissions();
  const canUpdateTransactions = hasPermissionInSet(
    permissions,
    PERMISSIONS.ACCOUNTING_TRANSACTIONS_UPDATE
  );
  const canDeleteTransactions = hasPermissionInSet(
    permissions,
    PERMISSIONS.ACCOUNTING_TRANSACTIONS_DELETE
  );
  const [methodFilter, setMethodFilter] =
    useState<MethodFilterValue>(METHOD_FILTER_ALL);
  const filteredTransactions = useMemo(
    () =>
      methodFilter === METHOD_FILTER_ALL
        ? transactions
        : transactions.filter((row) => row.payment_method === methodFilter),
    [transactions, methodFilter]
  );
  const methodCounts = useMemo(() => {
    const counts: Record<MethodFilterValue, number> = {
      [METHOD_FILTER_ALL]: transactions.length,
      [PAYMENT_METHODS.CASH]: 0,
      [PAYMENT_METHODS.WHISH]: 0,
    };
    for (const row of transactions) {
      if (row.payment_method === PAYMENT_METHODS.CASH) counts.cash += 1;
      if (row.payment_method === PAYMENT_METHODS.WHISH) counts.whish += 1;
    }
    return counts;
  }, [transactions]);
  const cashNet = netAmountForMethod(transactions, PAYMENT_METHODS.CASH);
  const whishNet = netAmountForMethod(transactions, PAYMENT_METHODS.WHISH);

  const transactionsPager = usePagedRows(filteredTransactions);
  const adjustmentsPager = usePagedRows(adjustments);
  const [activeTab, setActiveTab] = useState<string>(
    STATEMENT_TABS.TRANSACTIONS
  );
  const [createOpen, setCreateOpen] = useState(false);
  const { openEdit, openDelete, dialogs } = useExternalTransactionDialogs({
    onDeleted: (id) => {
      setTransactions((rows) => rows.filter((row) => row.id !== id));
    },
  });

  const showTransactionActions =
    !readOnly && (canUpdateTransactions || canDeleteTransactions);
  const activeMethodLabel =
    METHOD_FILTERS.find((option) => option.value === methodFilter)?.label ??
    "";

  return (
    <div className="flex flex-col gap-6">
      {!readOnly ? (
        <>
          <PanelPageHeader title="Income statement" />
          <div className="flex flex-wrap items-center justify-end gap-2 empty:hidden">
            <Can permission={PERMISSIONS.ACCOUNTING_INCOME_STATEMENT_VIEW}>
              <Link
                href={ROUTES.MANAGER_INCOME_STATEMENT_HISTORY}
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                <CalendarDaysIcon data-icon="inline-start" />
                Past months
              </Link>
            </Can>
            <Can
              permission={PERMISSIONS.ACCOUNTING_INCOME_STATEMENT_ANALYTICS_VIEW}
            >
              <Link
                href={ROUTES.MANAGER_INCOME_STATEMENT_ANALYTICS}
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                <LineChartIcon data-icon="inline-start" />
                Analytics
              </Link>
            </Can>
          </div>
        </>
      ) : null}

      <div className="grid gap-4 @lg/panel:grid-cols-2 @4xl/panel:grid-cols-6">
        <UserStatCard
          label="Cash"
          value={formatPaymentPhaseMoney(cashNet)}
          accentClassName="border-l-sky-500"
        />
        <UserStatCard
          label="Whish"
          value={formatPaymentPhaseMoney(whishNet)}
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
          label="Available money"
          value={formatPaymentPhaseMoney(stats.availableMoney)}
          accentClassName="border-l-indigo-500"
        />
        <UserStatCard
          label="Total adjustments"
          value={formatPaymentPhaseMoney(stats.totalAdjustmentsValue)}
          accentClassName="border-l-amber-500"
        />
      </div>

      <TabsPrimitive
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex flex-col gap-4"
      >
        <TabsListPrimitive className="flex h-auto w-full flex-wrap items-center gap-2 rounded-full bg-muted/60 p-1 ring-1 ring-foreground/8 @lg/panel:w-fit">
          <TabsTriggerPrimitive
            value={STATEMENT_TABS.TRANSACTIONS}
            className={TAB_TRIGGER_CLASS}
          >
            Transactions
            <CountBadge count={transactions.length} />
          </TabsTriggerPrimitive>
          <TabsTriggerPrimitive
            value={STATEMENT_TABS.ADJUSTMENTS}
            className={TAB_TRIGGER_CLASS}
          >
            Adjustments
            <CountBadge count={adjustments.length} />
          </TabsTriggerPrimitive>
        </TabsListPrimitive>

        <TabsContentsPrimitive>
          <TabsContentPrimitive
            value={STATEMENT_TABS.TRANSACTIONS}
            className="px-0 py-0"
          >
            <ClassTabCollapsibleSection
              title="External transactions"
              description="Credits and debits outside student payment phases."
              collapsible={false}
              action={
                readOnly ? undefined : (
                  <Can permission={PERMISSIONS.ACCOUNTING_TRANSACTIONS_CREATE}>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setCreateOpen(true)}
                    >
                      Add transaction
                    </Button>
                  </Can>
                )
              }
            >
              <div className="border-b border-foreground/10 px-3 py-2.5 sm:px-4">
                <div
                  role="radiogroup"
                  aria-label="Filter transactions by payment method"
                  className="flex w-fit max-w-full flex-wrap items-center gap-1 rounded-xl border bg-card p-1 shadow-xs"
                >
                  {METHOD_FILTERS.map((option) => {
                    const isActive = option.value === methodFilter;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={isActive}
                        onClick={() => {
                          setMethodFilter(option.value);
                          transactionsPager.setPage(1);
                        }}
                        className={cn(
                          "inline-flex h-8 items-center gap-2 rounded-lg border border-transparent px-3 text-sm font-medium",
                          "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                          isActive
                            ? "border-foreground/20 bg-foreground/10 text-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        {option.label}
                        <span
                          className={cn(
                            "text-xs tabular-nums",
                            isActive ? "opacity-90" : "opacity-60"
                          )}
                        >
                          {methodCounts[option.value]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {filteredTransactions.length === 0 ? (
                <div className="px-3 py-4 sm:px-4">
                  {transactions.length === 0 ? (
                    <EmptyState
                      size="sm"
                      icon={WalletIcon}
                      title="No external transactions recorded yet"
                      description="Credits and debits outside student payment phases appear here."
                    />
                  ) : (
                    <EmptyState
                      size="sm"
                      icon={WalletIcon}
                      title={`No ${activeMethodLabel} transactions`}
                      description={
                        periodLabel
                          ? `Nothing was paid by ${activeMethodLabel} in ${periodLabel}.`
                          : `Nothing was paid by ${activeMethodLabel} this month.`
                      }
                    />
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40 text-left">
                        <th className="px-4 py-3 font-medium">Date</th>
                        <th className="px-4 py-3 font-medium">Type</th>
                        <th className="px-4 py-3 font-medium">Description</th>
                        <th className="px-4 py-3 font-medium">Category</th>
                        <th className="px-4 py-3 font-medium text-right">
                          Amount
                        </th>
                        <th className="px-4 py-3 font-medium">Method</th>
                        <th className="px-4 py-3 font-medium">Recorded by</th>
                        {showTransactionActions ? (
                          <th className="px-4 py-3 font-medium text-right">
                            <span className="sr-only">Actions</span>
                          </th>
                        ) : null}
                      </tr>
                    </thead>
                    <tbody>
                      {transactionsPager.pagedRows.map((row) => {
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
                                  isCredit
                                    ? "text-teal-700 dark:text-teal-300"
                                    : "text-rose-700 dark:text-rose-300"
                                )}
                              >
                                {TRANSACTION_TYPE_LABELS[row.type]}
                              </span>
                            </td>
                            <td className="max-w-[16rem] px-4 py-3">
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
                            <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums font-medium">
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
                            {showTransactionActions ? (
                              <td className="px-4 py-3 text-right">
                                <ExternalTransactionRowActions
                                  description={row.description}
                                  linkedWorkshopPaymentId={
                                    row.linked_workshop_payment_id
                                  }
                                  canUpdate={canUpdateTransactions}
                                  canDelete={canDeleteTransactions}
                                  onEdit={() => openEdit(row)}
                                  onDelete={() => openDelete(row)}
                                />
                              </td>
                            ) : null}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {filteredTransactions.length > 0 ? (
                <IncomeTablePagination
                  totalCount={filteredTransactions.length}
                  pageSize={transactionsPager.pageSize}
                  currentPage={transactionsPager.page}
                  onPageChange={transactionsPager.setPage}
                  onPageSizeChange={(size) => {
                    transactionsPager.setPageSize(size);
                    transactionsPager.setPage(1);
                  }}
                />
              ) : null}
            </ClassTabCollapsibleSection>
          </TabsContentPrimitive>

          <TabsContentPrimitive
            value={STATEMENT_TABS.ADJUSTMENTS}
            className="px-0 py-0"
          >
            <ClassTabCollapsibleSection
              title="Financial adjustments"
              description="Discounts, scholarships, and manual adjustments by student."
              collapsible={false}
            >
              <div className="space-y-4 p-3 sm:p-4">
                <div className="grid gap-2 @lg/panel:grid-cols-2 @2xl/panel:grid-cols-5">
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
                      <p className="text-xs text-muted-foreground">
                        Scholarships
                      </p>
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
                      <p className="text-xs text-muted-foreground">
                        Adjustments total
                      </p>
                      <p className="text-lg font-semibold tabular-nums">
                        {formatPaymentPhaseMoney(stats.totalAdjustmentsValue)}
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

                {adjustments.length === 0 ? (
                  <EmptyState
                    size="sm"
                    icon={FileTextIcon}
                    title="No financial adjustments recorded yet"
                    description="Discounts, scholarships, and manual adjustments appear here."
                  />
                ) : (
                  <div className="overflow-x-auto rounded-xl border">
                    <table className="w-full min-w-[760px] text-sm">
                      <thead>
                        <tr className="border-b bg-muted/40 text-left">
                          <th className="px-4 py-3 font-medium">Student</th>
                          <th className="px-4 py-3 font-medium">Phase</th>
                          <th className="px-4 py-3 font-medium">Type</th>
                          <th className="px-4 py-3 font-medium text-right">
                            Value
                          </th>
                          <th className="px-4 py-3 font-medium">Effective</th>
                          <th className="px-4 py-3 font-medium">Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adjustmentsPager.pagedRows.map((row) => (
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
                                <TruncatedCell
                                  value={row.reason}
                                  maxLength={36}
                                />
                              ) : (
                                "—"
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <IncomeTablePagination
                      totalCount={adjustments.length}
                      pageSize={adjustmentsPager.pageSize}
                      currentPage={adjustmentsPager.page}
                      onPageChange={adjustmentsPager.setPage}
                      onPageSizeChange={(size) => {
                        adjustmentsPager.setPageSize(size);
                        adjustmentsPager.setPage(1);
                      }}
                    />
                  </div>
                )}
              </div>
            </ClassTabCollapsibleSection>
          </TabsContentPrimitive>
        </TabsContentsPrimitive>
      </TabsPrimitive>

      {readOnly ? null : (
        <>
          <CreateTransactionDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
          />
          {dialogs}
        </>
      )}
    </div>
  );
}
