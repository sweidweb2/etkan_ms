"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MessageSquareTextIcon,
  PencilIcon,
  SearchIcon,
} from "lucide-react";
import { Can } from "@/components/auth/can";
import { BorrowEquipmentStatusBadge } from "@/components/manager/students/borrow-equipment-status-badge";
import { EditBorrowEquipmentDialog } from "@/components/manager/students/edit-borrow-equipment-dialog";
import { ViewBorrowEquipmentDialog } from "@/components/manager/students/view-borrow-equipment-dialog";
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
import { Switch } from "@/components/ui/switch";
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
import {
  MANAGER_BORROW_EQUIPMENT_STATUS_LABELS,
  MANAGER_BORROW_EQUIPMENT_TOGGLE_LABELS,
} from "@/lib/constants/manager-student-borrow-equipment-display";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getManagerStudentBorrowEquipmentPreview } from "@/lib/manager/get-manager-student-borrow-equipment-preview";
import { showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import type { ManagerStudentBorrowEquipmentRow } from "@/types/manager-student-borrow-equipment";

const PAGE_SIZE_OPTIONS = [5, 10, 25] as const;
const STATUS_FILTER_ALL = "all";

const COLUMN_LIMITS = {
  equipmentName: 28,
  equipmentDescription: 36,
} as const;

type StudentBorrowedEquipmentSectionProps = {
  userId: string;
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

function matchesSearch(row: ManagerStudentBorrowEquipmentRow, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  return (
    row.equipment_name.toLowerCase().includes(normalizedQuery) ||
    (row.equipment_description?.toLowerCase().includes(normalizedQuery) ?? false) ||
    row.equipment_id.toLowerCase().includes(normalizedQuery)
  );
}

function formatDateCell(value: string | null) {
  if (!value) {
    return "—";
  }

  return format(new Date(value), "MMM d, yyyy");
}

export function StudentBorrowedEquipmentSection({
  userId,
}: StudentBorrowedEquipmentSectionProps) {
  const [borrows, setBorrows] = useState<ManagerStudentBorrowEquipmentRow[]>(() =>
    getManagerStudentBorrowEquipmentPreview(userId)
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(STATUS_FILTER_ALL);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [editRow, setEditRow] = useState<ManagerStudentBorrowEquipmentRow | null>(
    null
  );
  const [viewRow, setViewRow] = useState<ManagerStudentBorrowEquipmentRow | null>(
    null
  );
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const filteredBorrows = useMemo(() => {
    return borrows.filter((row) => {
      if (statusFilter !== STATUS_FILTER_ALL && row.status !== statusFilter) {
        return false;
      }

      return matchesSearch(row, searchQuery);
    });
  }, [borrows, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredBorrows.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedBorrows = filteredBorrows.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize
  );
  const rangeStart =
    filteredBorrows.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safeCurrentPage * pageSize, filteredBorrows.length);
  const pageNumbers = getPageNumbers(safeCurrentPage, totalPages);

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    setCurrentPage(1);
  }

  function handleStatusFilterChange(value: string | null) {
    if (!value) {
      return;
    }

    setStatusFilter(value);
    setCurrentPage(1);
  }

  function handlePageSizeChange(value: string | null) {
    if (!value) {
      return;
    }

    setPageSize(Number(value) as (typeof PAGE_SIZE_OPTIONS)[number]);
    setCurrentPage(1);
  }

  function handleUpdateBorrow(updatedRow: ManagerStudentBorrowEquipmentRow) {
    setBorrows((current) =>
      current.map((row) => (row.id === updatedRow.id ? updatedRow : row))
    );
  }

  function handleToggleStatus(
    row: ManagerStudentBorrowEquipmentRow,
    isBorrowed: boolean
  ) {
    const nextStatus: BorrowEquipmentStatusValue = isBorrowed
      ? BORROW_EQUIPMENT_STATUSES.BORROWED
      : BORROW_EQUIPMENT_STATUSES.RETURNED;

    const updatedRow: ManagerStudentBorrowEquipmentRow = {
      ...row,
      status: nextStatus,
      returned_at: isBorrowed ? null : new Date().toISOString(),
    };

    handleUpdateBorrow(updatedRow);
    showSuccessToast(
      isBorrowed
        ? "Equipment marked as borrowed."
        : "Equipment marked as returned."
    );
  }

  function openEditDialog(row: ManagerStudentBorrowEquipmentRow) {
    setEditRow(row);
    setIsEditOpen(true);
  }

  function openViewDialog(row: ManagerStudentBorrowEquipmentRow) {
    setViewRow(row);
    setIsViewOpen(true);
  }

  return (
    <TooltipProvider>
      <EditBorrowEquipmentDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        borrowRow={editRow}
        onUpdateBorrow={handleUpdateBorrow}
      />
      <ViewBorrowEquipmentDialog
        open={isViewOpen}
        onOpenChange={setIsViewOpen}
        borrowRow={viewRow}
      />

      <Card className="min-w-0 max-w-full overflow-hidden py-0">
        <CardHeader className="border-b bg-muted/40 py-3">
          <CardTitle>Borrowed equipment</CardTitle>
          <p className="text-sm text-muted-foreground">
            borrow_equipment records for this student with status, dates, and
            actions.
          </p>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="flex flex-col gap-3 border-b px-4 pt-2 pb-3 sm:flex-row sm:items-center sm:px-5">
            <div className="relative min-w-0 flex-1">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Search equipment name or ID…"
                className="pl-8"
                aria-label="Search borrowed equipment"
              />
            </div>
            <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
              <SelectTrigger
                className="w-full sm:w-44"
                aria-label="Filter by borrow status"
              >
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value={STATUS_FILTER_ALL}>All statuses</SelectItem>
                {BORROW_EQUIPMENT_STATUS_VALUES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {MANAGER_BORROW_EQUIPMENT_STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto px-1 sm:px-2">
            <table className="w-full min-w-[880px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-4 py-3 font-medium">Equipment</th>
                  <th className="px-4 py-3 font-medium">Qty</th>
                  <th className="px-4 py-3 font-medium">Borrowed</th>
                  <th className="px-4 py-3 font-medium">Returned</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Active</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedBorrows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-muted-foreground"
                    >
                      No borrowed equipment matches your filters.
                    </td>
                  </tr>
                ) : (
                  paginatedBorrows.map((row) => {
                    const isBorrowed =
                      row.status === BORROW_EQUIPMENT_STATUSES.BORROWED;

                    return (
                      <tr
                        key={row.id}
                        className="border-b last:border-b-0 hover:bg-muted/30"
                      >
                        <td className="max-w-[14rem] px-4 py-3">
                          <TruncatedCell
                            value={row.equipment_name}
                            maxLength={COLUMN_LIMITS.equipmentName}
                            className="font-medium"
                          />
                          <TruncatedCell
                            value={row.equipment_description ?? "—"}
                            maxLength={COLUMN_LIMITS.equipmentDescription}
                            className="mt-0.5 text-xs text-muted-foreground"
                          />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 tabular-nums">
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
                        <td className="px-4 py-3">
                          <Can permission={PERMISSIONS.EQUIPMENT_BORROW_RETURN}>
                            <Switch
                              checked={isBorrowed}
                              onCheckedChange={(checked) =>
                                handleToggleStatus(row, checked)
                              }
                              aria-label={
                                isBorrowed
                                  ? MANAGER_BORROW_EQUIPMENT_TOGGLE_LABELS.borrowed
                                  : MANAGER_BORROW_EQUIPMENT_TOGGLE_LABELS.returned
                              }
                            />
                          </Can>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Can permission={PERMISSIONS.EQUIPMENT_BORROW_UPDATE}>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Edit borrow record"
                                onClick={() => openEditDialog(row)}
                              >
                                <PencilIcon />
                              </Button>
                            </Can>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label="View full borrow details"
                              onClick={() => openViewDialog(row)}
                            >
                              <MessageSquareTextIcon />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t px-4 pt-2 pb-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
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
                    className="min-w-8"
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
