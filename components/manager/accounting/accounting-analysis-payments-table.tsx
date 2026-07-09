"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MessageSquareTextIcon,
  SearchIcon,
} from "lucide-react";
import { PaymentDetailsDialog } from "@/components/manager/accounting/payment-details-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import {
  formatPaymentMethodLabel,
  MANAGER_PAYMENT_TABLE_LIMITS,
} from "@/lib/constants/manager-payment-display";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_VALUES,
  type PaymentMethodValue,
} from "@/lib/constants/manager-payment-methods";
import { getManagerStudentAccountDetailRoute } from "@/lib/constants/routes";
import { formatAccountCurrency } from "@/lib/constants/manager-subscribed-semester-display";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import type { AccountingAnalysisPaymentRow } from "@/types/manager-accounting-analytics";
import type { AccountingAnalysisSemesterOption } from "@/types/manager-accounting-analytics";
import type { ManagerStudentPaymentRow } from "@/types/manager-student-account";

const PAGE_SIZE_OPTIONS = [5, 10, 25] as const;
const METHOD_FILTER_ALL = "all";
const SEMESTER_FILTER_ALL = "all";

type AccountingAnalysisPaymentsTableProps = {
  payments: AccountingAnalysisPaymentRow[];
  showSemesterFilter?: boolean;
  semesterOptions?: AccountingAnalysisSemesterOption[];
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
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className={cn("block cursor-default truncate", className)}
            tabIndex={0}
          />
        }
      >
        {display}
      </TooltipTrigger>
      <TooltipContent>{value}</TooltipContent>
    </Tooltip>
  );
}

function getPageNumbers(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, currentPage]);

  for (let offset = -1; offset <= 1; offset += 1) {
    const page = currentPage + offset;
    if (page > 1 && page < totalPages) {
      pages.add(page);
    }
  }

  const sortedPages = [...pages].sort((a, b) => a - b);
  const result: Array<number | "ellipsis"> = [];

  sortedPages.forEach((page, index) => {
    const previousPage = sortedPages[index - 1];
    if (previousPage !== undefined && page - previousPage > 1) {
      result.push("ellipsis");
    }
    result.push(page);
  });

  return result;
}

function matchesPaymentSearch(
  payment: AccountingAnalysisPaymentRow,
  query: string
) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  return [
    payment.studentName,
    payment.semester_name,
    String(payment.amount),
    payment.currency,
    formatPaymentMethodLabel(payment.method),
    format(new Date(payment.paid_at), "MMM d, yyyy"),
  ]
    .join(" ")
    .toLowerCase()
    .includes(normalizedQuery);
}

export function AccountingAnalysisPaymentsTable({
  payments,
  showSemesterFilter = false,
  semesterOptions = [],
}: AccountingAnalysisPaymentsTableProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [viewingPayment, setViewingPayment] =
    useState<ManagerStudentPaymentRow | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState<string>(METHOD_FILTER_ALL);
  const [semesterFilter, setSemesterFilter] = useState<string>(
    SEMESTER_FILTER_ALL
  );
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const matchesMethod =
        methodFilter === METHOD_FILTER_ALL || payment.method === methodFilter;
      const matchesSemester =
        !showSemesterFilter ||
        semesterFilter === SEMESTER_FILTER_ALL ||
        payment.semesterId === semesterFilter;

      return (
        matchesMethod &&
        matchesSemester &&
        matchesPaymentSearch(payment, searchQuery)
      );
    });
  }, [methodFilter, payments, searchQuery, semesterFilter, showSemesterFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedPayments = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return filteredPayments.slice(startIndex, startIndex + pageSize);
  }, [filteredPayments, pageSize, safeCurrentPage]);

  const pageNumbers = getPageNumbers(safeCurrentPage, totalPages);
  const rangeStart =
    filteredPayments.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safeCurrentPage * pageSize, filteredPayments.length);

  return (
    <TooltipProvider>
      <PaymentDetailsDialog
        open={isDetailsOpen}
        onOpenChange={(open) => {
          setIsDetailsOpen(open);
          if (!open) {
            setViewingPayment(null);
          }
        }}
        payment={viewingPayment}
      />

      <Card className="py-0">
        <CardHeader className="border-b bg-muted/40 py-4">
          <CardTitle>Payments</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="flex flex-col gap-3 border-b px-4 py-4 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search student, semester, amount, or method…"
                className="pl-8"
                aria-label="Search payments"
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              {showSemesterFilter ? (
                <Select
                  value={semesterFilter}
                  onValueChange={(value) => {
                    setSemesterFilter(value ?? SEMESTER_FILTER_ALL);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger
                    className="w-full sm:w-52"
                    aria-label="Filter by semester"
                  >
                    <SelectValue placeholder="All semesters" />
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectItem value={SEMESTER_FILTER_ALL}>
                      All semesters
                    </SelectItem>
                    {semesterOptions.map((semester) => (
                      <SelectItem key={semester.id} value={semester.id}>
                        {semester.shortName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
              <Select
                value={methodFilter}
                onValueChange={(value) => {
                  setMethodFilter(value ?? METHOD_FILTER_ALL);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger
                  className="w-full sm:w-44"
                  aria-label="Filter by payment method"
                >
                  <SelectValue placeholder="All methods" />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value={METHOD_FILTER_ALL}>All methods</SelectItem>
                  {PAYMENT_METHOD_VALUES.map((method) => (
                    <SelectItem key={method} value={method}>
                      {PAYMENT_METHOD_LABELS[method as PaymentMethodValue]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-4 py-3 font-medium">Paid at</th>
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Semester</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Method</th>
                  <th className="px-4 py-3 font-medium text-right">Details</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPayments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-muted-foreground"
                    >
                      {payments.length === 0
                        ? "No payments recorded for this period yet."
                        : "No payments match your filters."}
                    </td>
                  </tr>
                ) : (
                  paginatedPayments.map((payment) => (
                    <tr
                      key={payment.id}
                      className="border-b transition-colors last:border-b-0 hover:bg-muted/30"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {format(new Date(payment.paid_at), "MMM d, yyyy")}
                      </td>
                      <td className="max-w-[12rem] px-4 py-3">
                        <Link
                          href={getManagerStudentAccountDetailRoute(
                            payment.studentProfileId
                          )}
                          className="font-medium text-foreground underline-offset-4 hover:underline"
                        >
                          <TruncatedCell
                            value={payment.studentName}
                            maxLength={28}
                          />
                        </Link>
                      </td>
                      <td className="max-w-[10rem] px-4 py-3 text-muted-foreground">
                        <TruncatedCell
                          value={payment.semester_name}
                          maxLength={24}
                        />
                      </td>
                      <td className="px-4 py-3 font-medium tabular-nums">
                        {formatAccountCurrency(payment.amount, payment.currency)}
                      </td>
                      <td className="max-w-[10rem] px-4 py-3 text-muted-foreground">
                        <TruncatedCell
                          value={formatPaymentMethodLabel(payment.method)}
                          maxLength={MANAGER_PAYMENT_TABLE_LIMITS.method}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`View payment details for ${payment.studentName}`}
                            onClick={() => {
                              setViewingPayment(payment);
                              setIsDetailsOpen(true);
                            }}
                          >
                            <MessageSquareTextIcon />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>
                Showing {rangeStart}–{rangeEnd} of {filteredPayments.length}
              </span>
              <span aria-hidden="true">·</span>
              <div className="flex items-center gap-2">
                <span>Rows</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(value) => {
                    if (!value) {
                      return;
                    }

                    setPageSize(Number(value) as (typeof PAGE_SIZE_OPTIONS)[number]);
                    setCurrentPage(1);
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
                    {PAGE_SIZE_OPTIONS.map((option) => (
                      <SelectItem key={option} value={String(option)}>
                        {option}
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
                onClick={() => setCurrentPage((page) => page - 1)}
                aria-label="Previous page"
              >
                <ChevronLeftIcon />
              </Button>

              {pageNumbers.map((page, index) =>
                page === "ellipsis" ? (
                  <span
                    key={`ellipsis-${index}`}
                    className="px-1 text-sm text-muted-foreground"
                  >
                    …
                  </span>
                ) : (
                  <Button
                    key={page}
                    type="button"
                    variant={page === safeCurrentPage ? "default" : "outline"}
                    size="icon-sm"
                    className="min-w-7"
                    onClick={() => setCurrentPage(page)}
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
                onClick={() => setCurrentPage((page) => page + 1)}
                aria-label="Next page"
              >
                <ChevronRightIcon />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
