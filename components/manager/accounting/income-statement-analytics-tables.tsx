"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  BadgeDollarSignIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleHelpIcon,
  PencilIcon,
  UserRoundXIcon,
  UsersIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react";
import { Can } from "@/components/auth/can";
import { EditTransactionDialog } from "@/components/manager/accounting/edit-transaction-dialog";
import { SppStatusBadge } from "@/components/manager/accounting/spp-status-badge";
import { ClassTabCollapsibleSection } from "@/components/manager/students/class-tab-collapsible-section";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { COLLAPSIBLE_SECTION_STORAGE_KEYS } from "@/lib/constants/collapsible-section-storage";
import { formatPaymentPhaseMoney } from "@/lib/constants/manager-payment-phase-display";
import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  FINANCIAL_ADJUSTMENT_VALUE_TYPES,
  PAYMENT_METHOD_LABELS,
  TRANSACTION_TYPE_LABELS,
  TRANSACTION_TYPES,
  TRANSACTION_TYPE_VALUES,
  formatTransactionCategory,
  type FinancialAdjustmentValueType,
  type TransactionType,
} from "@/lib/manager/accounting/constants";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import type {
  ManagerIncomeAnalyticsAdjustedStudentRow,
  ManagerIncomeAnalyticsPaymentRow,
  ManagerIncomeAnalyticsTransactionRow,
  ManagerIncomeAnalyticsUnpaidStudentRow,
} from "@/types/manager-income-statement-analytics";

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;

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

function getPageNumbers(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages: Array<number | "ellipsis"> = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) pages.push("ellipsis");
  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }
  if (end < totalPages - 1) pages.push("ellipsis");
  pages.push(totalPages);

  return pages;
}

function MiniStatCard({
  label,
  value,
  description,
  icon: Icon,
  iconClassName,
}: {
  label: string;
  value: string;
  description?: string;
  icon: LucideIcon;
  iconClassName: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border px-4 py-3">
      <Icon
        className={`mt-0.5 size-4 shrink-0 ${iconClassName}`}
        aria-hidden
      />
      <div className="min-w-0">
        <div className="flex items-center gap-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          {description ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                      aria-label={`About ${label}`}
                    />
                  }
                >
                  <CircleHelpIcon className="size-3.5" aria-hidden />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs leading-snug">
                  {description}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
        </div>
        <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
      </div>
    </div>
  );
}

function TablePagination({
  totalCount,
  pageSize,
  currentPage,
  onPageChange,
  onPageSizeChange,
}: {
  totalCount: number;
  pageSize: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: (typeof PAGE_SIZE_OPTIONS)[number]) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const rangeStart = totalCount === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safeCurrentPage * pageSize, totalCount);
  const pageNumbers = getPageNumbers(safeCurrentPage, totalPages);

  return (
    <div className="flex flex-col gap-3 border-t px-4 pt-2 pb-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>
          Showing {rangeStart}–{rangeEnd} of {totalCount}
        </span>
        <span aria-hidden="true">·</span>
        <div className="flex items-center gap-2">
          <span>Rows</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              if (value == null) return;
              onPageSizeChange(
                Number(value) as (typeof PAGE_SIZE_OPTIONS)[number]
              );
            }}
          >
            <SelectTrigger
              size="sm"
              className="w-16"
              aria-label="Rows per page"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start">
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={safeCurrentPage <= 1}
          onClick={() => onPageChange(Math.max(1, safeCurrentPage - 1))}
          aria-label="Previous page"
        >
          <ChevronLeftIcon />
        </Button>
        {pageNumbers.map((page, index) =>
          page === "ellipsis" ? (
            <span
              key={`ellipsis-${index}`}
              className="px-1 text-muted-foreground"
            >
              …
            </span>
          ) : (
            <Button
              key={page}
              type="button"
              variant={page === safeCurrentPage ? "default" : "outline"}
              size="icon-sm"
              onClick={() => onPageChange(page)}
              aria-label={`Page ${page}`}
              aria-current={page === safeCurrentPage ? "page" : undefined}
            >
              {page}
            </Button>
          )
        )}
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={safeCurrentPage >= totalPages}
          onClick={() =>
            onPageChange(Math.min(totalPages, safeCurrentPage + 1))
          }
          aria-label="Next page"
        >
          <ChevronRightIcon />
        </Button>
      </div>
    </div>
  );
}

function usePagedRows<T>(rows: T[]) {
  const [pageSize, setPageSize] =
    useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [pageSize, rows, safePage]);

  return {
    pageSize,
    setPageSize,
    page: safePage,
    setPage,
    pagedRows,
  };
}

type EtkanTabProps = {
  transactions: ManagerIncomeAnalyticsTransactionRow[];
};

const TYPE_FILTER_ALL = "all";
type TransactionTypeFilter = typeof TYPE_FILTER_ALL | TransactionType;

export function IncomeStatementAnalyticsEtkanTab({
  transactions,
}: EtkanTabProps) {
  const [typeFilter, setTypeFilter] =
    useState<TransactionTypeFilter>(TYPE_FILTER_ALL);
  const filteredTransactions = useMemo(
    () =>
      typeFilter === TYPE_FILTER_ALL
        ? transactions
        : transactions.filter((row) => row.type === typeFilter),
    [transactions, typeFilter]
  );
  const { pageSize, setPageSize, page, setPage, pagedRows } =
    usePagedRows(filteredTransactions);
  const [editOpen, setEditOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<ManagerIncomeAnalyticsTransactionRow | null>(null);

  const credits = transactions.filter(
    (row) => row.type === TRANSACTION_TYPES.CREDIT
  );
  const debits = transactions.filter(
    (row) => row.type === TRANSACTION_TYPES.DEBIT
  );
  const creditsTotal = credits.reduce((sum, row) => sum + row.amount, 0);
  const debitsTotal = debits.reduce((sum, row) => sum + row.amount, 0);
  const netExternal = creditsTotal - debitsTotal;

  function handleEditOpenChange(open: boolean) {
    setEditOpen(open);
    if (!open) {
      setEditingTransaction(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStatCard
          label="Transactions"
          value={String(transactions.length)}
          icon={WalletIcon}
          iconClassName="text-violet-500"
        />
        <MiniStatCard
          label="Credits"
          value={formatPaymentPhaseMoney(creditsTotal)}
          icon={ArrowDownLeftIcon}
          iconClassName="text-teal-500"
        />
        <MiniStatCard
          label="Debits"
          value={formatPaymentPhaseMoney(debitsTotal)}
          icon={ArrowUpRightIcon}
          iconClassName="text-rose-500"
        />
        <MiniStatCard
          label="Net external"
          value={formatPaymentPhaseMoney(netExternal)}
          icon={BadgeDollarSignIcon}
          iconClassName="text-sky-500"
        />
      </div>

      <section className="overflow-hidden rounded-xl border">
        <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold">Etkan transactions</h3>
            <p className="text-xs text-muted-foreground">
              External credits and debits in the selected period.
            </p>
          </div>
          <Select
            value={typeFilter}
            onValueChange={(value) => {
              if (value == null) return;
              setTypeFilter(value as TransactionTypeFilter);
              setPage(1);
            }}
          >
            <SelectTrigger
              size="sm"
              className="w-[9.5rem]"
              aria-label="Filter by type"
            >
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value={TYPE_FILTER_ALL}>All types</SelectItem>
              {TRANSACTION_TYPE_VALUES.map((type) => (
                <SelectItem key={type} value={type}>
                  {TRANSACTION_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Recorded by</th>
                <th className="px-4 py-3 font-medium text-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {pagedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    {typeFilter === TYPE_FILTER_ALL
                      ? "No transactions in this period."
                      : `No ${TRANSACTION_TYPE_LABELS[typeFilter].toLowerCase()} transactions in this period.`}
                  </td>
                </tr>
              ) : (
                pagedRows.map((row) => {
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
                      <td className="max-w-[14rem] px-4 py-3 font-medium">
                        <TruncatedCell
                          value={row.description}
                          maxLength={36}
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
                      <td className="px-4 py-3 text-right">
                        <Can
                          permission={PERMISSIONS.ACCOUNTING_TRANSACTIONS_UPDATE}
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="size-7"
                            aria-label={`Edit transaction ${row.description}`}
                            onClick={() => {
                              setEditingTransaction(row);
                              setEditOpen(true);
                            }}
                          >
                            <PencilIcon className="size-3.5" />
                          </Button>
                        </Can>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <TablePagination
          totalCount={filteredTransactions.length}
          pageSize={pageSize}
          currentPage={page}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </section>

      <EditTransactionDialog
        open={editOpen}
        onOpenChange={handleEditOpenChange}
        transaction={editingTransaction}
      />
    </div>
  );
}

type StudentsTabProps = {
  payments: ManagerIncomeAnalyticsPaymentRow[];
  unpaidStudents: ManagerIncomeAnalyticsUnpaidStudentRow[];
  adjustedStudents: ManagerIncomeAnalyticsAdjustedStudentRow[];
};

function formatAdjustmentValue(
  valueType: FinancialAdjustmentValueType,
  value: number
) {
  if (valueType === FINANCIAL_ADJUSTMENT_VALUE_TYPES.PERCENTAGE) {
    return `${value}%`;
  }
  return formatPaymentPhaseMoney(value);
}

export function IncomeStatementAnalyticsStudentsTab({
  payments,
  unpaidStudents,
  adjustedStudents,
}: StudentsTabProps) {
  const paymentsPager = usePagedRows(payments);
  const unpaidPager = usePagedRows(unpaidStudents);
  const adjustedPager = usePagedRows(adjustedStudents);

  const paymentsTotal = payments.reduce((sum, row) => sum + row.amount, 0);
  const paidStudentCount = new Set(
    payments.map((row) => row.student_id).filter(Boolean)
  ).size;
  const unpaidMonthlyRemainingTotal = unpaidStudents.reduce(
    (sum, row) => sum + row.approx_monthly_remaining,
    0
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStatCard
          label="Payments"
          value={formatPaymentPhaseMoney(paymentsTotal)}
          icon={BadgeDollarSignIcon}
          iconClassName="text-emerald-500"
        />
        <MiniStatCard
          label="Students who paid"
          value={String(paidStudentCount)}
          icon={UsersIcon}
          iconClassName="text-sky-500"
        />
        <MiniStatCard
          label="Didn't pay"
          value={String(unpaidStudents.length)}
          icon={UserRoundXIcon}
          iconClassName="text-rose-500"
        />
        <MiniStatCard
          label="Unpaid this month"
          value={formatPaymentPhaseMoney(unpaidMonthlyRemainingTotal)}
          description="Approx. amount due ÷ phase duration for students who didn't pay (adjustments included)."
          icon={WalletIcon}
          iconClassName="text-amber-500"
        />
      </div>

      <ClassTabCollapsibleSection
        title="Payments this period"
        description="Student payments recorded in the selected period."
        storageKey={
          COLLAPSIBLE_SECTION_STORAGE_KEYS.INCOME_ANALYTICS_STUDENTS_PAYMENTS
        }
        defaultOpen
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Student</th>
                <th className="px-4 py-3 font-medium">Phase</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Received by</th>
                <th className="px-4 py-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {paymentsPager.pagedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    No student payments in this period.
                  </td>
                </tr>
              ) : (
                paymentsPager.pagedRows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b last:border-b-0 hover:bg-muted/30"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {format(
                        new Date(`${row.payment_date}T00:00:00`),
                        "MMM d, yyyy"
                      )}
                    </td>
                    <td className="max-w-[12rem] px-4 py-3 font-medium">
                      <TruncatedCell value={row.student_label} maxLength={28} />
                    </td>
                    <td className="max-w-[10rem] px-4 py-3">
                      <TruncatedCell
                        value={row.payment_phase_name}
                        maxLength={24}
                      />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums font-medium">
                      {formatPaymentPhaseMoney(row.amount)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {PAYMENT_METHOD_LABELS[row.payment_method]}
                    </td>
                    <td className="max-w-[10rem] px-4 py-3 text-muted-foreground">
                      <TruncatedCell value={row.received_by} maxLength={24} />
                    </td>
                    <td className="max-w-[10rem] px-4 py-3 text-muted-foreground">
                      {row.notes ? (
                        <TruncatedCell value={row.notes} maxLength={24} />
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
        <TablePagination
          totalCount={payments.length}
          pageSize={paymentsPager.pageSize}
          currentPage={paymentsPager.page}
          onPageChange={paymentsPager.setPage}
          onPageSizeChange={(size) => {
            paymentsPager.setPageSize(size);
            paymentsPager.setPage(1);
          }}
        />
      </ClassTabCollapsibleSection>

      <ClassTabCollapsibleSection
        title="Didn't pay this period"
        description="Active SPPs with remaining balance and no payment in the selected period."
        storageKey={
          COLLAPSIBLE_SECTION_STORAGE_KEYS.INCOME_ANALYTICS_STUDENTS_UNPAID
        }
        defaultOpen
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="px-4 py-3 font-medium">Student</th>
                <th className="px-4 py-3 font-medium">Phase</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Paid</th>
                <th className="px-4 py-3 font-medium text-right">Due</th>
                <th className="px-4 py-3 font-medium text-right">Remaining</th>
              </tr>
            </thead>
            <tbody>
              {unpaidPager.pagedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    Every active student with a balance paid in this period.
                  </td>
                </tr>
              ) : (
                unpaidPager.pagedRows.map((row) => (
                  <tr
                    key={row.spp_id}
                    className="border-b last:border-b-0 hover:bg-muted/30"
                  >
                    <td className="max-w-[14rem] px-4 py-3 font-medium">
                      <TruncatedCell value={row.student_label} maxLength={32} />
                    </td>
                    <td className="max-w-[12rem] px-4 py-3">
                      <TruncatedCell
                        value={row.payment_phase_name}
                        maxLength={28}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <SppStatusBadge status={row.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {formatPaymentPhaseMoney(row.total_paid)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {formatPaymentPhaseMoney(row.final_amount_due)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums font-medium text-rose-600">
                      {formatPaymentPhaseMoney(row.remaining_amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <TablePagination
          totalCount={unpaidStudents.length}
          pageSize={unpaidPager.pageSize}
          currentPage={unpaidPager.page}
          onPageChange={unpaidPager.setPage}
          onPageSizeChange={(size) => {
            unpaidPager.setPageSize(size);
            unpaidPager.setPage(1);
          }}
        />
      </ClassTabCollapsibleSection>

      <ClassTabCollapsibleSection
        title="Financial adjustments"
        description="Students with an adjustment, required amount due, and how much they paid in this period."
        storageKey={
          COLLAPSIBLE_SECTION_STORAGE_KEYS.INCOME_ANALYTICS_STUDENTS_ADJUSTMENTS
        }
        defaultOpen
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="px-4 py-3 font-medium">Student</th>
                <th className="px-4 py-3 font-medium">Phase</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium text-right">Adjustment</th>
                <th className="px-4 py-3 font-medium text-right">Required</th>
                <th className="px-4 py-3 font-medium text-right">
                  Paid this period
                </th>
              </tr>
            </thead>
            <tbody>
              {adjustedPager.pagedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    No students with financial adjustments.
                  </td>
                </tr>
              ) : (
                adjustedPager.pagedRows.map((row) => (
                  <tr
                    key={row.adjustment_id}
                    className="border-b last:border-b-0 hover:bg-muted/30"
                  >
                    <td className="max-w-[14rem] px-4 py-3 font-medium">
                      <TruncatedCell value={row.student_label} maxLength={32} />
                    </td>
                    <td className="max-w-[12rem] px-4 py-3">
                      <TruncatedCell
                        value={row.payment_phase_name}
                        maxLength={28}
                      />
                    </td>
                    <td className="px-4 py-3">{row.type_label}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                      <span className="font-medium">
                        {formatAdjustmentValue(row.value_type, row.value)}
                      </span>
                      {row.value_type ===
                      FINANCIAL_ADJUSTMENT_VALUE_TYPES.PERCENTAGE ? (
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({formatPaymentPhaseMoney(row.adjustment_amount)})
                        </span>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums font-medium">
                      {formatPaymentPhaseMoney(row.final_amount_due)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums font-medium text-emerald-600">
                      {formatPaymentPhaseMoney(row.paid_this_period)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <TablePagination
          totalCount={adjustedStudents.length}
          pageSize={adjustedPager.pageSize}
          currentPage={adjustedPager.page}
          onPageChange={adjustedPager.setPage}
          onPageSizeChange={(size) => {
            adjustedPager.setPageSize(size);
            adjustedPager.setPage(1);
          }}
        />
      </ClassTabCollapsibleSection>
    </div>
  );
}
