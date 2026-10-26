"use client";

import Link from "next/link";
import {
  useMemo,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  WalletIcon,
} from "lucide-react";
import {
  Tabs as TabsPrimitive,
  TabsContent as TabsContentPrimitive,
  TabsContents as TabsContentsPrimitive,
  TabsList as TabsListPrimitive,
  TabsTrigger as TabsTriggerPrimitive,
} from "@/components/animate-ui/primitives/animate/tabs";
import { Can } from "@/components/auth/can";
import { CreatePaymentPhaseDialog } from "@/components/manager/accounting/create-payment-phase-dialog";
import { EditPaymentPhaseDialog } from "@/components/manager/accounting/edit-payment-phase-dialog";
import { PaymentPhaseStatusBadge } from "@/components/manager/accounting/payment-phase-status-badge";
import { PaymentPhasesTimeline } from "@/components/manager/accounting/payment-phases-timeline";
import { UpfrontWindowChip } from "@/components/manager/accounting/upfront-window-chip";
import { UserStatCard } from "@/components/manager/users/user-stat-card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { formatPaymentPhaseMoney, PAYMENT_PHASE_STATUS_LABELS } from "@/lib/constants/manager-payment-phase-display";
import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  getManagerAccountingPhaseDetailRoute,
  getManagerSemesterDetailRoute,
} from "@/lib/constants/routes";
import {
  PAYMENT_PHASE_STATUSES,
  PAYMENT_PHASE_STATUS_VALUES,
  type PaymentPhaseStatus,
} from "@/lib/manager/accounting/constants";
import { cn } from "@/lib/utils";
import { prependUniqueById } from "@/lib/utils/prepend-unique-by-id";
import { truncateText } from "@/lib/utils/truncate-text";
import type {
  ManagerPaymentPhaseRow,
} from "@/types/manager-payment-phase";

const PAGE_SIZE_OPTIONS = [5, 10, 25] as const;
const STATUS_FILTER_ALL = "all";

type AccountingPageTab =
  | "timeline"
  | "phases"
  | "missing-prior"
  | "exceptions";

const TAB_TRIGGER_CLASS = cn(
  "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 sm:px-4 sm:text-sm",
  "border-transparent text-muted-foreground hover:border-border/60 hover:bg-background/80 hover:text-foreground hover:shadow-sm",
  "data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md",
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
);

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
  paidThisMonthTotal: number;
  missingPriorAdjustmentSection: ReactNode;
  exceptionsSection: ReactNode;
};

export function ManageAccountingPanel({
  initialPhases,
  paidThisMonthTotal,
  missingPriorAdjustmentSection,
  exceptionsSection,
}: ManageAccountingPanelProps) {
  const router = useRouter();
  const [phases, setPhases] = useState(initialPhases);
  const [prevPhases, setPrevPhases] = useState(initialPhases);
  const [activeTab, setActiveTab] = useState<AccountingPageTab>("timeline");

  if (initialPhases !== prevPhases) {
    setPrevPhases(initialPhases);
    setPhases(initialPhases);
  }

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editPhase, setEditPhase] = useState<ManagerPaymentPhaseRow | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(STATUS_FILTER_ALL);
  const [showAllPhases, setShowAllPhases] = useState(false);
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
      sppPaidCount: phases.reduce(
        (sum, phase) => sum + phase.spp_paid_count,
        0
      ),
      sppActiveCount: phases.reduce(
        (sum, phase) => sum + phase.spp_active_count,
        0
      ),
    };
  }, [phases]);

  const filteredPhases = useMemo(() => {
    return phases.filter((phase) => {
      if (
        !showAllPhases &&
        phase.status !== PAYMENT_PHASE_STATUSES.OPENED
      ) {
        return false;
      }
      const matchesStatus =
        statusFilter === STATUS_FILTER_ALL || phase.status === statusFilter;
      return matchesStatus && matchesPhaseSearch(phase, searchQuery);
    });
  }, [phases, searchQuery, showAllPhases, statusFilter]);

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

  const handleShowAllPhasesChange = (checked: boolean) => {
    setShowAllPhases(checked);
    if (
      !checked &&
      statusFilter !== STATUS_FILTER_ALL &&
      statusFilter !== PAYMENT_PHASE_STATUSES.OPENED
    ) {
      setStatusFilter(STATUS_FILTER_ALL);
    }
    setCurrentPage(1);
  };

  const handlePageSizeChange = (value: string | null) => {
    if (!value) {
      return;
    }
    setPageSize(Number(value) as (typeof PAGE_SIZE_OPTIONS)[number]);
    setCurrentPage(1);
  };

  const handleCreated = (phase: ManagerPaymentPhaseRow) => {
    setPhases((current) => prependUniqueById(current, phase));
    setCurrentPage(1);
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
        </div>

        <CreatePaymentPhaseDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          onCreated={handleCreated}
        />

        {editPhase ? (
          <EditPaymentPhaseDialog
            open
            onOpenChange={(open) => {
              if (!open) {
                setEditPhase(null);
              }
            }}
            phase={editPhase}
            onUpdated={(updated) => {
              setEditPhase(null);
              setPhases((current) =>
                current.map((phase) => (phase.id === updated.id ? updated : phase))
              );
            }}
          />
        ) : null}

        <TabsPrimitive
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as AccountingPageTab)}
          className="flex flex-col gap-4"
        >
          <TabsListPrimitive className="flex h-auto w-full flex-wrap items-center gap-2 rounded-full bg-muted/60 p-1 ring-1 ring-foreground/8 sm:w-fit">
            <TabsTriggerPrimitive value="timeline" className={TAB_TRIGGER_CLASS}>
              Timeline
            </TabsTriggerPrimitive>
            <TabsTriggerPrimitive value="phases" className={TAB_TRIGGER_CLASS}>
              Payment phases
            </TabsTriggerPrimitive>
            <TabsTriggerPrimitive
              value="missing-prior"
              className={TAB_TRIGGER_CLASS}
            >
              Missing prior
            </TabsTriggerPrimitive>
            <TabsTriggerPrimitive
              value="exceptions"
              className={TAB_TRIGGER_CLASS}
            >
              Exceptions
            </TabsTriggerPrimitive>
          </TabsListPrimitive>

          <TabsContentsPrimitive>
            <TabsContentPrimitive value="timeline" className="outline-none">
              <div className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
                    label="Students"
                    value={stats.sppActiveCount}
                    accentClassName="border-l-violet-500"
                  />
                  <UserStatCard
                    label="Paid this month"
                    value={formatPaymentPhaseMoney(paidThisMonthTotal)}
                    accentClassName="border-l-amber-500"
                  />
                </div>
                <PaymentPhasesTimeline phases={phases} />
              </div>
            </TabsContentPrimitive>

            <TabsContentPrimitive value="phases" className="outline-none">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="rounded-lg border-l-4 border-l-emerald-500 bg-card px-3 py-1.5 ring-1 ring-foreground/10 sm:w-fit">
                    <p className="text-[11px] leading-tight text-muted-foreground">
                      SPP paid / active
                    </p>
                    <p className="text-sm font-semibold tabular-nums tracking-tight">
                      {stats.sppPaidCount}/{stats.sppActiveCount}
                    </p>
                  </div>
                  <Can permission={PERMISSIONS.ACCOUNTING_PAYMENT_PHASES_CREATE}>
                    <Button type="button" onClick={() => setIsCreateOpen(true)}>
                      <PlusIcon data-icon="inline-start" />
                      Create payment phase
                    </Button>
                  </Can>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative max-w-md flex-1">
                    <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(event) =>
                        handleSearchChange(event.target.value)
                      }
                      placeholder="Search name, semester, or code…"
                      className="pl-8"
                      aria-label="Search payment phases"
                    />
                  </div>
                  <Select
                    value={statusFilter}
                    items={STATUS_FILTER_SELECT_ITEMS.filter(
                      (item) =>
                        showAllPhases ||
                        item.value === STATUS_FILTER_ALL ||
                        item.value === PAYMENT_PHASE_STATUSES.OPENED
                    )}
                    onValueChange={handleStatusFilterChange}
                  >
                    <SelectTrigger className="w-full sm:w-44" aria-label="Status">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent align="start">
                      <SelectItem value={STATUS_FILTER_ALL}>
                        All statuses
                      </SelectItem>
                      {PAYMENT_PHASE_STATUS_VALUES.filter(
                        (status) =>
                          showAllPhases ||
                          status === PAYMENT_PHASE_STATUSES.OPENED
                      ).map((status) => (
                        <SelectItem key={status} value={status}>
                          {PAYMENT_PHASE_STATUS_LABELS[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2 sm:h-9">
                    <Checkbox
                      id="accounting-filter-show-all"
                      checked={showAllPhases}
                      onCheckedChange={handleShowAllPhasesChange}
                    />
                    <Label
                      htmlFor="accounting-filter-show-all"
                      className="cursor-pointer font-normal"
                    >
                      Show all
                    </Label>
                  </div>
                </div>

                {paginatedPhases.length === 0 ? (
                  <EmptyState
                    icon={phases.length === 0 ? WalletIcon : SearchIcon}
                    title={
                      phases.length === 0
                        ? "No payment phases yet"
                        : "No payment phases match your filters"
                    }
                    description={
                      phases.length === 0
                        ? "Create a payment phase to get started."
                        : "Try a different search or status."
                    }
                  />
                ) : (
                  <div className="overflow-x-auto overflow-hidden rounded-xl border">
                    <table className="w-full min-w-[900px] text-sm">
                      <thead>
                        <tr className="border-b bg-muted/40 text-left">
                          <th className="px-4 py-3 font-medium">Name</th>
                          <th className="px-4 py-3 font-medium">Semester</th>
                          <th className="px-4 py-3 font-medium">Status</th>
                          <th className="px-4 py-3 font-medium text-right">
                            Amount
                          </th>
                          <th className="px-4 py-3 font-medium text-right">
                            Upfront
                          </th>
                          <th className="px-4 py-3 font-medium text-right">
                            Duration
                          </th>
                          <th className="px-4 py-3 font-medium">Dates</th>
                          <th className="px-4 py-3 font-medium text-right">
                            SPP paid / active
                          </th>
                          <th className="px-4 py-3 font-medium text-right">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedPhases.map((phase) => (
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
                              <TruncatedCell
                                value={phase.name}
                                maxLength={28}
                              />
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
                            <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                              {phase.duration_months === 1
                                ? "1 month"
                                : `${phase.duration_months} months`}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                              {format(
                                new Date(phase.start_date),
                                "MMM d, yyyy"
                              )}
                              {" – "}
                              {format(new Date(phase.end_date), "MMM d, yyyy")}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                              <span className="inline-flex items-center justify-end gap-2">
                                {phase.upfront_window_active ? (
                                  <UpfrontWindowChip />
                                ) : null}
                                <span>
                                  {phase.spp_paid_count}/{phase.spp_active_count}
                                </span>
                              </span>
                            </td>
                            <td
                              className="px-4 py-3"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <div className="flex items-center justify-end gap-0.5">
                                {phase.status !==
                                PAYMENT_PHASE_STATUSES.CANCELLED ? (
                                  <Can
                                    permission={
                                      PERMISSIONS.ACCOUNTING_PAYMENT_PHASES_UPDATE
                                    }
                                  >
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon-sm"
                                      aria-label={`Edit ${phase.name}`}
                                      className="text-muted-foreground hover:text-foreground"
                                      onClick={() => setEditPhase(phase)}
                                    >
                                      <PencilIcon />
                                    </Button>
                                  </Can>
                                ) : null}
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
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span>
                      Showing {rangeStart}–{rangeEnd} of{" "}
                      {filteredPhases.length}
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
                      onClick={() =>
                        setCurrentPage((page) => Math.max(1, page - 1))
                      }
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
                          variant={
                            page === safeCurrentPage ? "default" : "outline"
                          }
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
                        setCurrentPage((page) =>
                          Math.min(totalPages, page + 1)
                        )
                      }
                      aria-label="Next page"
                    >
                      <ChevronRightIcon />
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContentPrimitive>

            <TabsContentPrimitive
              value="missing-prior"
              className="outline-none"
            >
              {missingPriorAdjustmentSection}
            </TabsContentPrimitive>

            <TabsContentPrimitive value="exceptions" className="outline-none">
              {exceptionsSection}
            </TabsContentPrimitive>
          </TabsContentsPrimitive>
        </TabsPrimitive>
      </div>
    </TooltipProvider>
  );
}
