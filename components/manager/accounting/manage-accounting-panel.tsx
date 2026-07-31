"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react";
import { Can } from "@/components/auth/can";
import { CreatePaymentPhaseDialog } from "@/components/manager/accounting/create-payment-phase-dialog";
import { PaymentPhaseStatusBadge } from "@/components/manager/accounting/payment-phase-status-badge";
import { RepairMissingSppButton } from "@/components/manager/accounting/repair-missing-spp-button";
import { UserStatCard } from "@/components/manager/users/user-stat-card";
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
import { formatPaymentPhaseMoney } from "@/lib/constants/manager-payment-phase-display";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getManagerAccountingPhaseDetailRoute } from "@/lib/constants/routes";
import {
  PAYMENT_PHASE_STATUSES,
  PAYMENT_PHASE_STATUS_VALUES,
  type PaymentPhaseStatus,
} from "@/lib/manager/accounting/constants";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import type {
  ManagerMissingSppRow,
  ManagerPaymentPhaseClassOption,
  ManagerPaymentPhaseRow,
} from "@/types/manager-payment-phase";

const PAGE_SIZE_OPTIONS = [5, 10, 25] as const;
const STATUS_FILTER_ALL = "all";

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

function matchesPhaseSearch(phase: ManagerPaymentPhaseRow, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  const haystack = [
    phase.name,
    phase.class_name,
    phase.semester_code,
    phase.status,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}

type ManageAccountingPanelProps = {
  initialPhases: ManagerPaymentPhaseRow[];
  initialMissing: ManagerMissingSppRow[];
  classOptions: ManagerPaymentPhaseClassOption[];
};

export function ManageAccountingPanel({
  initialPhases,
  initialMissing,
  classOptions,
}: ManageAccountingPanelProps) {
  const router = useRouter();
  const phases = initialPhases;
  const missing = initialMissing;

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(STATUS_FILTER_ALL);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(
    10
  );
  const [currentPage, setCurrentPage] = useState(1);

  const stats = useMemo(() => {
    return {
      totalPhases: phases.length,
      openedPhases: phases.filter(
        (phase) => phase.status === PAYMENT_PHASE_STATUSES.OPENED
      ).length,
      missingAssignments: missing.length,
    };
  }, [phases, missing]);

  const filteredPhases = useMemo(() => {
    return phases.filter((phase) => {
      const matchesStatus =
        statusFilter === STATUS_FILTER_ALL || phase.status === statusFilter;
      return matchesStatus && matchesPhaseSearch(phase, searchQuery);
    });
  }, [phases, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredPhases.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedPhases = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return filteredPhases.slice(startIndex, startIndex + pageSize);
  }, [filteredPhases, pageSize, safeCurrentPage]);

  const pageNumbers = getPageNumbers(safeCurrentPage, totalPages);
  const rangeStart =
    filteredPhases.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(
    safeCurrentPage * pageSize,
    filteredPhases.length
  );

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

  const handleCreated = () => {
    router.refresh();
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Accounting</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Open payment phases by class and assign enrolled students.
            </p>
          </div>
          <Can permission={PERMISSIONS.ACCOUNTING_PAYMENT_PHASES_CREATE}>
            <Button type="button" onClick={() => setIsCreateOpen(true)}>
              <PlusIcon data-icon="inline-start" />
              Create payment phase
            </Button>
          </Can>
        </div>

        <CreatePaymentPhaseDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          classOptions={classOptions}
          onCreated={handleCreated}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <UserStatCard
            label="Payment phases"
            value={stats.totalPhases}
            accentClassName="border-l-sky-500"
          />
          <UserStatCard
            label="Opened"
            value={stats.openedPhases}
            accentClassName="border-l-emerald-500"
          />
          <UserStatCard
            label="Missing assignments"
            value={stats.missingAssignments}
            accentClassName="border-l-amber-500"
          />
        </div>

        <Card className="py-0">
          <CardHeader className="border-b py-3">
            <CardTitle>Payment phases</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="flex flex-col gap-3 border-b px-4 pt-2 pb-3 sm:flex-row sm:items-center">
              <div className="relative max-w-md flex-1">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  placeholder="Search name, class, or semester code…"
                  className="pl-8"
                  aria-label="Search payment phases"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={handleStatusFilterChange}
              >
                <SelectTrigger className="w-full sm:w-44" aria-label="Status">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent align="start">
                  <SelectItem value={STATUS_FILTER_ALL}>All statuses</SelectItem>
                  {PAYMENT_PHASE_STATUS_VALUES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status === PAYMENT_PHASE_STATUSES.OPENED
                        ? "Opened"
                        : status === PAYMENT_PHASE_STATUSES.CLOSED
                          ? "Closed"
                          : "Cancelled"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Class</th>
                    <th className="px-4 py-3 font-medium">Semester</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Amount</th>
                    <th className="px-4 py-3 font-medium text-right">Upfront</th>
                    <th className="px-4 py-3 font-medium">Dates</th>
                    <th className="px-4 py-3 font-medium text-right">
                      SPP paid / active
                    </th>
                    <th className="px-4 py-3 font-medium">Created</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPhases.length === 0 ? (
                    <tr>
                      <td
                        colSpan={10}
                        className="px-4 py-10 text-center text-muted-foreground"
                      >
                        No payment phases match your filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedPhases.map((phase) => (
                      <tr
                        key={phase.id}
                        className="border-b last:border-b-0 hover:bg-muted/30"
                      >
                        <td className="max-w-[12rem] px-4 py-3 font-medium">
                          <TruncatedCell value={phase.name} maxLength={28} />
                        </td>
                        <td className="max-w-[12rem] px-4 py-3">
                          <TruncatedCell
                            value={phase.class_name}
                            maxLength={28}
                          />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 tabular-nums text-muted-foreground">
                          {phase.semester_code}
                        </td>
                        <td className="px-4 py-3">
                          <PaymentPhaseStatusBadge
                            status={phase.status as PaymentPhaseStatus}
                          />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                          {formatPaymentPhaseMoney(phase.amount)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-muted-foreground">
                          {formatPaymentPhaseMoney(phase.upfront_amount)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {format(new Date(phase.start_date), "MMM d, yyyy")}
                          {" – "}
                          {format(new Date(phase.end_date), "MMM d, yyyy")}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                          {phase.spp_paid_count}/{phase.spp_active_count}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {format(new Date(phase.created_at), "MMM d, yyyy")}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end">
                            <Button
                              render={
                                <Link
                                  href={getManagerAccountingPhaseDetailRoute(
                                    phase.id
                                  )}
                                />
                              }
                              nativeButton={false}
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`View ${phase.name}`}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <EyeIcon />
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
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>
                  Showing {rangeStart}–{rangeEnd} of {filteredPhases.length}
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
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
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
                  onClick={() =>
                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                  }
                  aria-label="Next page"
                >
                  <ChevronRightIcon />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="py-0">
          <CardHeader className="border-b py-3">
            <CardTitle>Missing student payment phases</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
                    <th className="px-4 py-3 font-medium">Student</th>
                    <th className="px-4 py-3 font-medium">Class</th>
                    <th className="px-4 py-3 font-medium">Phase</th>
                    <th className="px-4 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {missing.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-10 text-center text-muted-foreground"
                      >
                        All enrolled students on opened phases have an
                        assignment.
                      </td>
                    </tr>
                  ) : (
                    missing.map((row) => (
                      <tr
                        key={`${row.payment_phase_id}:${row.student_id}`}
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
                            value={row.class_name}
                            maxLength={28}
                          />
                        </td>
                        <td className="max-w-[12rem] px-4 py-3">
                          <TruncatedCell
                            value={row.payment_phase_name}
                            maxLength={28}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            <Can
                              permission={
                                PERMISSIONS.ACCOUNTING_PAYMENT_PHASES_CREATE
                              }
                            >
                              <RepairMissingSppButton row={row} />
                            </Can>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
