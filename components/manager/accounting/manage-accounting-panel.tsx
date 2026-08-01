"use client";

import Link from "next/link";
import { useMemo, useState, type KeyboardEvent } from "react";
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
import { AssignMissingSppDialog } from "@/components/manager/accounting/assign-missing-spp-dialog";
import { CreatePaymentPhaseDialog } from "@/components/manager/accounting/create-payment-phase-dialog";
import { PaymentPhaseStatusBadge } from "@/components/manager/accounting/payment-phase-status-badge";
import { StudentsWithoutActiveClassCard } from "@/components/manager/shared/students-without-active-class-card";
import { ClassTabCollapsibleSection } from "@/components/manager/students/class-tab-collapsible-section";
import { UserStatCard } from "@/components/manager/users/user-stat-card";
import { Button } from "@/components/ui/button";
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
import { COLLAPSIBLE_SECTION_STORAGE_KEYS } from "@/lib/constants/collapsible-section-storage";
import { formatPaymentPhaseMoney, PAYMENT_PHASE_STATUS_LABELS } from "@/lib/constants/manager-payment-phase-display";
import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  getManagerAccountingPhaseDetailRoute,
  getManagerAccountingSppDetailRoute,
  getManagerClassDetailRoute,
  getManagerSemesterDetailRoute,
  getManagerStudentDetailRoute,
} from "@/lib/constants/routes";
import {
  PAYMENT_PHASE_STATUSES,
  PAYMENT_PHASE_STATUS_VALUES,
  type PaymentPhaseStatus,
} from "@/lib/manager/accounting/constants";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import type {
  ManagerMissingSppRow,
  ManagerPaymentPhaseRow,
  ManagerPaymentPhaseSemesterOption,
  ManagerSppSemesterMismatchRow,
} from "@/types/manager-payment-phase";
import type { ManagerStudentWithoutActiveClassRow } from "@/types/manager-student";

const PAGE_SIZE_OPTIONS = [5, 10, 25] as const;
const STATUS_FILTER_ALL = "all";

const PHASE_ROW_CLASS =
  "cursor-pointer border-b last:border-b-0 transition-all duration-150 hover:bg-primary/10 hover:shadow-[inset_4px_0_0_0_var(--primary)] active:bg-primary/15 focus-visible:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset";

const STATUS_FILTER_SELECT_ITEMS = [
  { value: STATUS_FILTER_ALL, label: "All statuses" },
  ...PAYMENT_PHASE_STATUS_VALUES.map((status) => ({
    value: status,
    label: PAYMENT_PHASE_STATUS_LABELS[status],
  })),
];

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
    phase.semester_name,
    phase.semester_code,
    phase.billing_class_name ?? "",
    phase.status,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}

type ManageAccountingPanelProps = {
  initialPhases: ManagerPaymentPhaseRow[];
  initialMissing: ManagerMissingSppRow[];
  initialStudentsWithoutActiveClass: ManagerStudentWithoutActiveClassRow[];
  initialSppSemesterMismatches: ManagerSppSemesterMismatchRow[];
  semesterOptions: ManagerPaymentPhaseSemesterOption[];
};

export function ManageAccountingPanel({
  initialPhases,
  initialMissing,
  initialStudentsWithoutActiveClass,
  initialSppSemesterMismatches,
  semesterOptions,
}: ManageAccountingPanelProps) {
  const router = useRouter();
  const phases = initialPhases;
  const missing = initialMissing;
  const studentsWithoutActiveClass = initialStudentsWithoutActiveClass;
  const sppSemesterMismatches = initialSppSemesterMismatches;

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [assignRow, setAssignRow] = useState<ManagerMissingSppRow | null>(null);
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
      studentsWithoutActiveClass: studentsWithoutActiveClass.length,
    };
  }, [phases, missing, studentsWithoutActiveClass]);

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

  const openPhaseDetails = (phaseId: string) => {
    router.push(getManagerAccountingPhaseDetailRoute(phaseId));
  };

  const handlePhaseRowKeyDown = (
    event: KeyboardEvent<HTMLTableRowElement>,
    phaseId: string
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openPhaseDetails(phaseId);
    }
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Accounting</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Open payment phases by semester and assign enrolled students.
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
          semesterOptions={semesterOptions}
          onCreated={handleCreated}
        />

        <AssignMissingSppDialog
          open={assignRow !== null}
          onOpenChange={(open) => {
            if (!open) {
              setAssignRow(null);
            }
          }}
          row={assignRow}
          phases={phases}
        />

        <ClassTabCollapsibleSection
          title="Overview"
          description="Quick counts for phases, gaps, and students without an active class."
          storageKey={COLLAPSIBLE_SECTION_STORAGE_KEYS.ACCOUNTING_OVERVIEW}
          defaultOpen
        >
          <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-4">
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
            <UserStatCard
              label="No active class"
              value={stats.studentsWithoutActiveClass}
              accentClassName="border-l-rose-500"
            />
          </div>
        </ClassTabCollapsibleSection>

        <ClassTabCollapsibleSection
          title="Payment phases"
          description="Opened, closed, and cancelled phases by semester."
          storageKey={COLLAPSIBLE_SECTION_STORAGE_KEYS.ACCOUNTING_PAYMENT_PHASES}
          defaultOpen
        >
          <div className="flex flex-col gap-3 border-b px-4 pt-2 pb-3 sm:flex-row sm:items-center">
              <div className="relative max-w-md flex-1">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  placeholder="Search name, semester, or code…"
                  className="pl-8"
                  aria-label="Search payment phases"
                />
              </div>
              <Select
                value={statusFilter}
                items={STATUS_FILTER_SELECT_ITEMS}
                onValueChange={handleStatusFilterChange}
              >
                <SelectTrigger className="w-full sm:w-44" aria-label="Status">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent align="start">
                  <SelectItem value={STATUS_FILTER_ALL}>All statuses</SelectItem>
                  {PAYMENT_PHASE_STATUS_VALUES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {PAYMENT_PHASE_STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Semester</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Amount</th>
                    <th className="px-4 py-3 font-medium text-right">Upfront</th>
                    <th className="px-4 py-3 font-medium">Dates</th>
                    <th className="px-4 py-3 font-medium text-right">
                      SPP paid / active
                    </th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPhases.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-10 text-center text-muted-foreground"
                      >
                        {phases.length === 0
                          ? "No payment phases yet."
                          : "No payment phases match your filters."}
                      </td>
                    </tr>
                  ) : (
                    paginatedPhases.map((phase) => (
                      <tr
                        key={phase.id}
                        className={PHASE_ROW_CLASS}
                        tabIndex={0}
                        role="link"
                        aria-label={`View ${phase.name}`}
                        onClick={() => openPhaseDetails(phase.id)}
                        onKeyDown={(event) =>
                          handlePhaseRowKeyDown(event, phase.id)
                        }
                      >
                        <td className="max-w-[12rem] px-4 py-3 font-medium">
                          <TruncatedCell value={phase.name} maxLength={28} />
                        </td>
                        <td
                          className="max-w-[12rem] px-4 py-3"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Link
                            href={getManagerSemesterDetailRoute(
                              phase.semester_id
                            )}
                            className="text-primary hover:underline"
                          >
                            <TruncatedCell
                              value={phase.semester_name}
                              maxLength={28}
                            />
                          </Link>
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
                        <td
                          className="px-4 py-3"
                          onClick={(event) => event.stopPropagation()}
                        >
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
        </ClassTabCollapsibleSection>

        <ClassTabCollapsibleSection
          title="Missing student payment phases"
          description="Enrolled students on opened phases who still need an assignment."
          storageKey={COLLAPSIBLE_SECTION_STORAGE_KEYS.ACCOUNTING_MISSING_SPP}
          defaultOpen
        >
          <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
                    <th className="px-4 py-3 font-medium">Student</th>
                    <th className="px-4 py-3 font-medium">Semester</th>
                    <th className="px-4 py-3 font-medium">Billing class</th>
                    <th className="px-4 py-3 font-medium">Phase</th>
                    <th className="px-4 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {missing.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
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
                            value={row.semester_name}
                            maxLength={28}
                          />
                        </td>
                        <td className="max-w-[12rem] px-4 py-3">
                          <TruncatedCell
                            value={row.billing_class_name}
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
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setAssignRow(row)}
                              >
                                Assign
                              </Button>
                            </Can>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
        </ClassTabCollapsibleSection>

        <ClassTabCollapsibleSection
          title="SPP semester mismatch"
          description="Students with an active billing record on a payment phase whose semester does not match their current in-progress class."
          storageKey={
            COLLAPSIBLE_SECTION_STORAGE_KEYS.ACCOUNTING_SPP_SEMESTER_MISMATCH
          }
          defaultOpen
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">SPP phase / semester</th>
                  <th className="px-4 py-3 font-medium">
                    Current class / semester
                  </th>
                  <th className="px-4 py-3 font-medium text-right">Links</th>
                </tr>
              </thead>
              <tbody>
                {sppSemesterMismatches.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-10 text-center text-muted-foreground"
                    >
                      No semester mismatches between active SPPs and current
                      classes.
                    </td>
                  </tr>
                ) : (
                  sppSemesterMismatches.map((row) => (
                    <tr
                      key={row.spp_id}
                      className="border-b last:border-b-0 hover:bg-muted/30"
                    >
                      <td className="max-w-[14rem] px-4 py-3 font-medium">
                        <TruncatedCell
                          value={row.student_label}
                          maxLength={32}
                        />
                      </td>
                      <td className="max-w-[16rem] px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <TruncatedCell
                            value={row.payment_phase_name}
                            maxLength={28}
                          />
                          <span className="text-xs text-muted-foreground">
                            {row.phase_semester_name}
                          </span>
                        </div>
                      </td>
                      <td className="max-w-[16rem] px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <TruncatedCell
                            value={row.current_class_name}
                            maxLength={28}
                          />
                          <span className="text-xs text-muted-foreground">
                            {row.current_semester_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {row.student_profile_id ? (
                            <Button
                              render={
                                <Link
                                  href={getManagerStudentDetailRoute(
                                    row.student_profile_id
                                  )}
                                />
                              }
                              nativeButton={false}
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`View ${row.student_label}`}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <EyeIcon />
                            </Button>
                          ) : null}
                          <Button
                            render={
                              <Link
                                href={getManagerAccountingPhaseDetailRoute(
                                  row.payment_phase_id
                                )}
                              />
                            }
                            nativeButton={false}
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            Phase
                          </Button>
                          <Button
                            render={
                              <Link
                                href={getManagerAccountingSppDetailRoute(
                                  row.payment_phase_id,
                                  row.spp_id
                                )}
                              />
                            }
                            nativeButton={false}
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            SPP
                          </Button>
                          <Button
                            render={
                              <Link
                                href={getManagerClassDetailRoute(
                                  row.current_class_id
                                )}
                              />
                            }
                            nativeButton={false}
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            Class
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </ClassTabCollapsibleSection>

        <StudentsWithoutActiveClassCard
          students={studentsWithoutActiveClass}
          description="Students who are not members of any in-progress class. They may still have billing or payment-phase records."
          storageKey={
            COLLAPSIBLE_SECTION_STORAGE_KEYS.ACCOUNTING_STUDENTS_WITHOUT_ACTIVE_CLASS
          }
          defaultOpen
        />
      </div>
    </TooltipProvider>
  );
}
