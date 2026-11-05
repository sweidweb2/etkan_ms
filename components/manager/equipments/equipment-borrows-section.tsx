"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  HistoryIcon,
  SearchIcon,
} from "lucide-react";
import { BorrowEquipmentStatusBadge } from "@/components/manager/students/borrow-equipment-status-badge";
import { UserStatCard } from "@/components/manager/users/user-stat-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
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
  BORROW_EQUIPMENT_STATUSES,
  BORROW_EQUIPMENT_STATUS_VALUES,
  type BorrowEquipmentStatusValue,
} from "@/lib/constants/manager-borrow-equipment-status";
import { MANAGER_EQUIPMENT_BORROW_TABLE_LIMITS } from "@/lib/constants/manager-equipment-borrow-display";
import { MANAGER_BORROW_EQUIPMENT_STATUS_LABELS } from "@/lib/constants/manager-student-borrow-equipment-display";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import type { ManagerEquipmentBorrowRow } from "@/types/manager-equipment-borrow";

const PAGE_SIZE_OPTIONS = [5, 10, 25] as const;
const STATUS_FILTER_ALL = "all";

type EquipmentBorrowsSectionProps = {
  equipmentName: string;
  initialBorrows: ManagerEquipmentBorrowRow[];
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

function matchesSearch(row: ManagerEquipmentBorrowRow, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  return [row.student_name, row.status]
    .join(" ")
    .toLowerCase()
    .includes(normalizedQuery);
}

function matchesStatusFilter(
  row: ManagerEquipmentBorrowRow,
  statusFilter: string
) {
  if (statusFilter === STATUS_FILTER_ALL) {
    return true;
  }

  return row.status === statusFilter;
}

function formatDateCell(value: string | null) {
  if (!value) {
    return "—";
  }

  return format(new Date(value), "MMM d, yyyy");
}

export function EquipmentBorrowsSection({
  equipmentName,
  initialBorrows,
}: EquipmentBorrowsSectionProps) {
  const borrows = initialBorrows;
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(STATUS_FILTER_ALL);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(
    10
  );
  const [currentPage, setCurrentPage] = useState(1);

  const stats = useMemo(
    () => ({
      total: borrows.length,
      borrowed: borrows.filter(
        (row) => row.status === BORROW_EQUIPMENT_STATUSES.BORROWED
      ).length,
      returned: borrows.filter(
        (row) => row.status === BORROW_EQUIPMENT_STATUSES.RETURNED
      ).length,
      unitsOut: borrows
        .filter((row) => row.status === BORROW_EQUIPMENT_STATUSES.BORROWED)
        .reduce((sum, row) => sum + row.quantity, 0),
    }),
    [borrows]
  );

  const filteredBorrows = useMemo(() => {
    return borrows.filter(
      (row) =>
        matchesSearch(row, searchQuery) &&
        matchesStatusFilter(row, statusFilter)
    );
  }, [borrows, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredBorrows.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedBorrows = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return filteredBorrows.slice(startIndex, startIndex + pageSize);
  }, [filteredBorrows, pageSize, safeCurrentPage]);

  const pageNumbers = getPageNumbers(safeCurrentPage, totalPages);
  const rangeStart =
    filteredBorrows.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safeCurrentPage * pageSize, filteredBorrows.length);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (value: string | null) => {
    setStatusFilter(value ?? STATUS_FILTER_ALL);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (value: string | null) => {
    if (!value) {
      return;
    }

    setPageSize(Number(value) as (typeof PAGE_SIZE_OPTIONS)[number]);
    setCurrentPage(1);
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-4">
        <div className="grid gap-4 @lg/panel:grid-cols-2 @4xl/panel:grid-cols-4">
          <UserStatCard
            label="Total records"
            value={stats.total}
            accentClassName="border-l-sky-500"
          />
          <UserStatCard
            label="Active borrows"
            value={stats.borrowed}
            accentClassName="border-l-amber-500"
          />
          <UserStatCard
            label="Returned"
            value={stats.returned}
            accentClassName="border-l-emerald-500"
          />
          <UserStatCard
            label="Units out"
            value={stats.unitsOut}
            accentClassName="border-l-violet-500"
          />
        </div>

        <Card className="py-0">
          <CardHeader className="border-b bg-muted/40 py-3">
            <CardTitle>Borrowing records</CardTitle>
            <CardDescription>
              Students who borrowed {equipmentName}.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="flex flex-col gap-3 border-b px-4 pt-3 pb-3 @lg/panel:flex-row @lg/panel:items-center">
              <div className="relative min-w-0 flex-1">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  placeholder="Search student or status…"
                  className="pl-8"
                  aria-label="Search borrowing records"
                />
              </div>
              <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                <SelectTrigger
                  className="w-full @lg/panel:w-40"
                  aria-label="Filter by status"
                >
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value={STATUS_FILTER_ALL}>All statuses</SelectItem>
                  {BORROW_EQUIPMENT_STATUS_VALUES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {
                        MANAGER_BORROW_EQUIPMENT_STATUS_LABELS[
                          status as BorrowEquipmentStatusValue
                        ]
                      }
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {paginatedBorrows.length === 0 ? (
              <EmptyState
                className="m-4"
                size="sm"
                icon={borrows.length === 0 ? HistoryIcon : SearchIcon}
                title={
                  borrows.length === 0
                    ? "No borrowing records"
                    : "No matching records"
                }
                description={
                  borrows.length === 0
                    ? "No students have borrowed this equipment yet."
                    : "No borrowing records match your filters."
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left">
                      <th className="px-4 py-3 font-medium">Student</th>
                      <th className="px-4 py-3 font-medium text-right">Qty</th>
                      <th className="px-4 py-3 font-medium">Borrowed</th>
                      <th className="px-4 py-3 font-medium">Returned</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedBorrows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b last:border-b-0 hover:bg-muted/30"
                      >
                        <td className="max-w-[12rem] px-4 py-3 font-medium">
                          <TruncatedCell
                            value={row.student_name}
                            maxLength={
                              MANAGER_EQUIPMENT_BORROW_TABLE_LIMITS.studentName
                            }
                          />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                          {row.quantity}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {formatDateCell(row.borrowed_at)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {formatDateCell(row.returned_at)}
                        </td>
                        <td className="px-4 py-3">
                          <BorrowEquipmentStatusBadge status={row.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-col gap-3 border-t px-4 pt-2 pb-3 @lg/panel:flex-row @lg/panel:items-center @lg/panel:justify-between">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>
                  Showing {rangeStart}–{rangeEnd} of {filteredBorrows.length}
                </span>
                <span aria-hidden="true">·</span>
                <div className="flex items-center gap-2">
                  <span>Rows</span>
                  <Select
                    value={String(pageSize)}
                    onValueChange={handlePageSizeChange}
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
                      aria-current={
                        page === safeCurrentPage ? "page" : undefined
                      }
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
      </div>
    </TooltipProvider>
  );
}
