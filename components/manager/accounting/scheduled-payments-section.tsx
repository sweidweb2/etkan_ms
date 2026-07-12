"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  CalendarClockIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MessageSquareTextIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react";
import { AddScheduledPaymentDialog } from "@/components/manager/accounting/add-scheduled-payment-dialog";
import { EditScheduledPaymentDialog } from "@/components/manager/accounting/edit-scheduled-payment-dialog";
import { ScheduledPaymentDetailsDialog } from "@/components/manager/accounting/scheduled-payment-details-dialog";
import { ScheduledPaymentStatusBadge } from "@/components/manager/accounting/scheduled-payment-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  MANAGER_SCHEDULED_PAYMENT_STATUS_LABELS,
  MANAGER_SCHEDULED_PAYMENT_TABLE_LIMITS,
} from "@/lib/constants/manager-scheduled-payment-display";
import {
  SCHEDULED_PAYMENT_STATUS_VALUES,
  type ScheduledPaymentStatusValue,
} from "@/lib/constants/manager-scheduled-payment-status";
import { formatAccountCurrency } from "@/lib/constants/manager-subscribed-semester-display";
import {
  getBillingMutationLockMessage,
  type SubscriptionBillingGate,
} from "@/lib/manager/subscribed-semester-billing";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import type { ManagerScheduledPaymentRow } from "@/types/manager-scheduled-payment";

const PAGE_SIZE = 5;
const STATUS_FILTER_ALL = "all";

type ScheduledPaymentsSectionProps = {
  subscribedSemesterId: string;
  semesterName: string;
  balanceDue: number;
  canMutate: boolean;
  lockReason: SubscriptionBillingGate["lockReason"];
  scheduledPayments: ManagerScheduledPaymentRow[];
  onScheduledPaymentSaved: () => void;
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

function matchesScheduledPaymentSearch(
  row: ManagerScheduledPaymentRow,
  query: string
) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  return [
    row.note ?? "",
    row.amount != null ? String(row.amount) : "",
    format(new Date(row.payment_date), "MMM d, yyyy"),
    MANAGER_SCHEDULED_PAYMENT_STATUS_LABELS[row.status],
  ]
    .join(" ")
    .toLowerCase()
    .includes(normalizedQuery);
}

export function ScheduledPaymentsSection({
  subscribedSemesterId,
  semesterName,
  balanceDue,
  canMutate,
  lockReason,
  scheduledPayments,
  onScheduledPaymentSaved,
}: ScheduledPaymentsSectionProps) {
  const canSchedule = canMutate && balanceDue > 0;
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<ManagerScheduledPaymentRow | null>(
    null
  );
  const [viewingRow, setViewingRow] = useState<ManagerScheduledPaymentRow | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(STATUS_FILTER_ALL);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredRows = useMemo(() => {
    return scheduledPayments.filter((row) => {
      const matchesStatus =
        statusFilter === STATUS_FILTER_ALL || row.status === statusFilter;

      return matchesStatus && matchesScheduledPaymentSearch(row, searchQuery);
    });
  }, [scheduledPayments, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedRows = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredRows.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredRows, safeCurrentPage]);

  const pageNumbers = getPageNumbers(safeCurrentPage, totalPages);
  const rangeStart =
    filteredRows.length === 0 ? 0 : (safeCurrentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safeCurrentPage * PAGE_SIZE, filteredRows.length);

  return (
    <TooltipProvider>
      <AddScheduledPaymentDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        subscribedSemesterId={subscribedSemesterId}
        semesterName={semesterName}
        balanceDue={balanceDue}
        onScheduledPaymentSaved={onScheduledPaymentSaved}
      />

      <EditScheduledPaymentDialog
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) {
            setEditingRow(null);
          }
        }}
        scheduledPayment={editingRow}
        onScheduledPaymentSaved={onScheduledPaymentSaved}
      />

      <ScheduledPaymentDetailsDialog
        open={isDetailsOpen}
        onOpenChange={(open) => {
          setIsDetailsOpen(open);
          if (!open) {
            setViewingRow(null);
          }
        }}
        scheduledPayment={viewingRow}
        semesterName={semesterName}
      />

      <Card className="py-0">
        <CardHeader className="border-b bg-muted/40 py-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-700 dark:text-sky-400">
              <CalendarClockIcon className="size-4" aria-hidden="true" />
            </span>
            <div>
              <CardTitle>Schedule payment</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Reminder checkpoints for you and the student. Informational only —
                not actual payments.
              </p>
            </div>
          </div>
          <CardAction className="self-center">
            <Button
              type="button"
              disabled={!canSchedule}
              onClick={() => setIsAddOpen(true)}
            >
              <PlusIcon data-icon="inline-start" />
              Schedule reminder
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {!canSchedule ? (
            <div className="border-b px-4 pt-2 pb-3">
              <p className="text-sm text-muted-foreground">
                {!canMutate
                  ? getBillingMutationLockMessage(lockReason, "schedules")
                  : "This subscription is fully paid. Scheduled reminders are only available while there is an outstanding balance."}
              </p>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 border-b px-4 pt-2 pb-3 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search note, amount, or date…"
                className="pl-8"
                aria-label="Search scheduled payments"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value ?? STATUS_FILTER_ALL);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger
                className="w-full sm:w-44"
                aria-label="Filter by status"
              >
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value={STATUS_FILTER_ALL}>All statuses</SelectItem>
                {SCHEDULED_PAYMENT_STATUS_VALUES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {
                      MANAGER_SCHEDULED_PAYMENT_STATUS_LABELS[
                        status as ScheduledPaymentStatusValue
                      ]
                    }
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-4 py-3 font-medium">Payment date</th>
                  <th className="px-4 py-3 font-medium">Expected amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Note</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-muted-foreground"
                    >
                      {scheduledPayments.length === 0
                        ? canSchedule
                          ? "No payment reminders scheduled yet."
                          : "No scheduled reminders for a fully paid subscription."
                        : "No scheduled payments match your filters."}
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b last:border-b-0 hover:bg-muted/20"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {format(new Date(row.payment_date), "MMM d, yyyy 'at' h:mm a")}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {row.amount != null
                          ? formatAccountCurrency(row.amount)
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <ScheduledPaymentStatusBadge status={row.status} />
                      </td>
                      <td className="max-w-[14rem] px-4 py-3 text-muted-foreground">
                        <TruncatedCell
                          value={row.note ?? "—"}
                          maxLength={MANAGER_SCHEDULED_PAYMENT_TABLE_LIMITS.note}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label="View scheduled payment details"
                            onClick={() => {
                              setViewingRow(row);
                              setIsDetailsOpen(true);
                            }}
                          >
                            <MessageSquareTextIcon />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            disabled={!canMutate}
                            aria-label="Edit scheduled payment"
                            onClick={() => {
                              setEditingRow(row);
                              setIsEditOpen(true);
                            }}
                          >
                            <PencilIcon />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t px-4 pt-2 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {rangeStart}–{rangeEnd} of {filteredRows.length}
            </p>

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
