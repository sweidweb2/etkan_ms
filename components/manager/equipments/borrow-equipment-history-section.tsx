"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { format } from "date-fns";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilIcon,
  SearchIcon,
} from "lucide-react";
import {
  toggleBorrowReturnedAction,
} from "@/app/manager/equipments/actions";
import { EditBorrowRecordDialog } from "@/components/manager/equipments/edit-borrow-record-dialog";
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
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import {
  BORROW_EQUIPMENT_STATUSES,
  BORROW_EQUIPMENT_STATUS_VALUES,
  type BorrowEquipmentStatusValue,
} from "@/lib/constants/manager-borrow-equipment-status";
import {
  MANAGER_BORROW_EQUIPMENT_STATUS_LABELS,
  MANAGER_BORROW_RETURNED_TOGGLE_LABELS,
} from "@/lib/constants/manager-student-borrow-equipment-display";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import type {
  ManagerBorrowEquipmentListRow,
  ToggleBorrowReturnedActionState,
} from "@/types/manager-borrow-equipment-list";
import type { ManagerEquipmentRow } from "@/types/manager-equipment";

const TABLE_PAGE_SIZE = 10;
const STATUS_FILTER_ALL = "all";

const COLUMN_LIMITS = {
  studentName: 24,
  equipmentName: 28,
  equipmentDescription: 32,
} as const;

const initialToggleState: ToggleBorrowReturnedActionState = {};

type BorrowEquipmentHistorySectionProps = {
  borrows: ManagerBorrowEquipmentListRow[];
  equipments: ManagerEquipmentRow[];
  onRecordsChanged: () => void;
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

function matchesSearch(row: ManagerBorrowEquipmentListRow, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  const haystack = [
    row.student_name,
    row.equipment_name,
    row.equipment_description ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}

function matchesStatusFilter(
  row: ManagerBorrowEquipmentListRow,
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

export function BorrowEquipmentHistorySection({
  borrows,
  equipments,
  onRecordsChanged,
}: BorrowEquipmentHistorySectionProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [toggleState, toggleAction, isTogglePending] = useActionState(
    toggleBorrowReturnedAction,
    initialToggleState
  );
  const isToggleActionPending = isTogglePending || isTransitionPending;

  useActionStateToast(toggleState, isToggleActionPending);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(STATUS_FILTER_ALL);
  const [currentPage, setCurrentPage] = useState(1);
  const [editRow, setEditRow] = useState<ManagerBorrowEquipmentListRow | null>(
    null
  );
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [pendingToggleId, setPendingToggleId] = useState<string | null>(null);
  const [optimisticReturnedById, setOptimisticReturnedById] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    if (isToggleActionPending || !pendingToggleId) {
      return;
    }

    if (toggleState.success) {
      setOptimisticReturnedById((current) => {
        const next = { ...current };
        delete next[pendingToggleId];
        return next;
      });
      setPendingToggleId(null);
      onRecordsChanged();
      return;
    }

    if (toggleState.error) {
      setOptimisticReturnedById((current) => {
        const next = { ...current };
        delete next[pendingToggleId];
        return next;
      });
      setPendingToggleId(null);
    }
  }, [
    isToggleActionPending,
    onRecordsChanged,
    pendingToggleId,
    toggleState.error,
    toggleState.success,
  ]);

  const getRowIsReturned = (row: ManagerBorrowEquipmentListRow) => {
    if (row.id in optimisticReturnedById) {
      return optimisticReturnedById[row.id]!;
    }

    return row.status === BORROW_EQUIPMENT_STATUSES.RETURNED;
  };

  const stats = useMemo(
    () => ({
      total: borrows.length,
      borrowed: borrows.filter(
        (row) => row.status === BORROW_EQUIPMENT_STATUSES.BORROWED
      ).length,
      returned: borrows.filter(
        (row) => row.status === BORROW_EQUIPMENT_STATUSES.RETURNED
      ).length,
      students: new Set(borrows.map((row) => row.user_id)).size,
    }),
    [borrows]
  );

  const filteredBorrows = useMemo(() => {
    return borrows.filter((row) => {
      return (
        matchesSearch(row, searchQuery) && matchesStatusFilter(row, statusFilter)
      );
    });
  }, [borrows, searchQuery, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredBorrows.length / TABLE_PAGE_SIZE)
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedBorrows = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * TABLE_PAGE_SIZE;
    return filteredBorrows.slice(startIndex, startIndex + TABLE_PAGE_SIZE);
  }, [filteredBorrows, safeCurrentPage]);

  const pageNumbers = getPageNumbers(safeCurrentPage, totalPages);
  const rangeStart =
    filteredBorrows.length === 0
      ? 0
      : (safeCurrentPage - 1) * TABLE_PAGE_SIZE + 1;
  const rangeEnd = Math.min(
    safeCurrentPage * TABLE_PAGE_SIZE,
    filteredBorrows.length
  );

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (value: string | null) => {
    setStatusFilter(value ?? STATUS_FILTER_ALL);
    setCurrentPage(1);
  };

  const handleToggleReturned = (
    row: ManagerBorrowEquipmentListRow,
    isReturned: boolean
  ) => {
    setOptimisticReturnedById((current) => ({
      ...current,
      [row.id]: isReturned,
    }));

    const formData = new FormData();
    formData.set("id", row.id);
    formData.set("isReturned", String(isReturned));

    setPendingToggleId(row.id);
    startTransition(() => {
      toggleAction(formData);
    });
  };

  const openEditDialog = (row: ManagerBorrowEquipmentListRow) => {
    setEditRow(row);
    setIsEditOpen(true);
  };

  return (
    <TooltipProvider>
      <EditBorrowRecordDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        borrowRow={editRow}
        equipments={equipments}
        onSaved={onRecordsChanged}
      />

      <div className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
            label="Students"
            value={stats.students}
            accentClassName="border-l-violet-500"
          />
        </div>

        <Card className="py-0">
          <CardHeader className="border-b bg-muted/40 py-3">
            <CardTitle>Borrowing records</CardTitle>
            <CardDescription>
              Borrow history across all students and equipment.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="flex flex-col gap-3 border-b px-4 pt-2 pb-3 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  placeholder="Search student or equipment…"
                  className="pl-8"
                  aria-label="Search borrowing records"
                />
              </div>
              <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                <SelectTrigger
                  className="w-full sm:w-40"
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

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
                    <th className="px-4 py-3 font-medium">Student</th>
                    <th className="px-4 py-3 font-medium">Equipment</th>
                    <th className="px-4 py-3 font-medium">Description</th>
                    <th className="px-4 py-3 font-medium text-right">Qty</th>
                    <th className="px-4 py-3 font-medium">Borrowed</th>
                    <th className="px-4 py-3 font-medium">Returned</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Returned?</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedBorrows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-10 text-center text-muted-foreground"
                      >
                        No borrowing records match your filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedBorrows.map((row) => {
                      const isReturned = getRowIsReturned(row);
                      const isTogglePending =
                        isToggleActionPending && pendingToggleId === row.id;

                      return (
                        <tr
                          key={row.id}
                          className="border-b last:border-b-0 hover:bg-muted/30"
                        >
                          <td className="max-w-[11rem] px-4 py-3 font-medium">
                            <TruncatedCell
                              value={row.student_name}
                              maxLength={COLUMN_LIMITS.studentName}
                            />
                          </td>
                          <td className="max-w-[12rem] px-4 py-3">
                            <TruncatedCell
                              value={row.equipment_name}
                              maxLength={COLUMN_LIMITS.equipmentName}
                            />
                          </td>
                          <td className="max-w-[14rem] px-4 py-3 text-muted-foreground">
                            <TruncatedCell
                              value={row.equipment_description ?? "—"}
                              maxLength={COLUMN_LIMITS.equipmentDescription}
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
                          <td className="px-4 py-3">
                            <Switch
                              checked={isReturned}
                              disabled={isTogglePending}
                              onCheckedChange={(checked) =>
                                handleToggleReturned(row, checked)
                              }
                              className={
                                isReturned
                                  ? "bg-emerald-500 hover:bg-emerald-500/90"
                                  : undefined
                              }
                              aria-label={
                                isReturned
                                  ? MANAGER_BORROW_RETURNED_TOGGLE_LABELS.on
                                  : MANAGER_BORROW_RETURNED_TOGGLE_LABELS.off
                              }
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Edit borrow record"
                                onClick={() => openEditDialog(row)}
                              >
                                <PencilIcon />
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

            <div className="flex flex-col gap-3 border-t px-4 pt-2 pb-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm text-muted-foreground">
                {filteredBorrows.length <= TABLE_PAGE_SIZE
                  ? `Showing ${filteredBorrows.length} ${filteredBorrows.length === 1 ? "row" : "rows"}`
                  : `Showing ${rangeStart}–${rangeEnd} of ${filteredBorrows.length}`}
              </span>

              {filteredBorrows.length > TABLE_PAGE_SIZE ? (
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
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
