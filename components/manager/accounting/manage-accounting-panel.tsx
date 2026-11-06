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
import {
  getPageNumbers,
  PAGE_SIZE_OPTIONS,
  STATUS_FILTER_ALL,
  TruncatedCell,
} from "@/components/manager/accounting/accounting-table-shared";
import { CreatePaymentPhaseDialog } from "@/components/manager/accounting/create-payment-phase-dialog";
import { EditPaymentPhaseDialog } from "@/components/manager/accounting/edit-payment-phase-dialog";
import { PaymentPhaseStatusBadge } from "@/components/manager/accounting/payment-phase-status-badge";
import { PaymentPhasesTimeline } from "@/components/manager/accounting/payment-phases-timeline";
import { UpfrontWindowChip } from "@/components/manager/accounting/upfront-window-chip";
import { ListViewModeToggle } from "@/components/manager/shared/list-view-mode-toggle";
import { UserStatCard } from "@/components/manager/users/user-stat-card";
import { PanelPageHeader } from "@/components/panels/panel-page-header";
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
import { TooltipProvider } from "@/components/ui/tooltip";
import { useHasMounted } from "@/hooks/use-has-mounted";
import { usePersistedListViewMode } from "@/hooks/use-persisted-list-view-mode";
import {
  MANAGER_LIST_VIEW_MODES,
  MANAGER_LIST_VIEW_MODE_STORAGE_KEYS,
} from "@/lib/constants/manager-list-view-mode";
import {
  MANAGER_ACCOUNTING_TABS,
  readManagerAccountingTab,
  writeManagerAccountingTab,
  type ManagerAccountingTab,
} from "@/lib/constants/manager-accounting-tabs";
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
import type {
  ManagerPaymentPhaseRow,
} from "@/types/manager-payment-phase";

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

const SPP_RING_RADIUS = 12;
const SPP_RING_CIRCUMFERENCE = 2 * Math.PI * SPP_RING_RADIUS;

function SppPaidSummary({ paid, active }: { paid: number; active: number }) {
  const ratio = active > 0 ? Math.min(1, paid / active) : 0;
  const percent = Math.round(ratio * 100);

  return (
    <div
      role="group"
      aria-label={`SPP paid: ${paid} of ${active} active (${percent}%)`}
      className="flex h-10 items-center gap-2.5 rounded-xl border bg-card pr-2 pl-1.5 shadow-xs"
    >
      <svg viewBox="0 0 32 32" className="size-7 -rotate-90" aria-hidden="true">
        <circle
          cx="16"
          cy="16"
          r={SPP_RING_RADIUS}
          strokeWidth="4"
          className="fill-none stroke-muted"
        />
        {ratio > 0 ? (
          <circle
            cx="16"
            cy="16"
            r={SPP_RING_RADIUS}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={SPP_RING_CIRCUMFERENCE}
            strokeDashoffset={SPP_RING_CIRCUMFERENCE * (1 - ratio)}
            className="fill-none stroke-emerald-500 transition-[stroke-dashoffset] duration-500"
          />
        ) : null}
      </svg>
      <div className="flex flex-col leading-tight">
        <span className="text-[11px] text-muted-foreground">SPP paid</span>
        <span className="text-sm font-semibold tabular-nums">
          {paid}
          <span className="font-normal text-muted-foreground"> / {active}</span>
        </span>
      </div>
      <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-xs font-medium tabular-nums text-emerald-700 dark:text-emerald-300">
        {percent}%
      </span>
    </div>
  );
}

const PHASE_CARD_CLASS =
  "group flex cursor-pointer flex-col gap-4 rounded-xl border bg-card p-4 shadow-xs transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md active:translate-y-0 active:bg-primary/5 focus-visible:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

type PaymentPhaseCardProps = {
  phase: ManagerPaymentPhaseRow;
  position: number;
  onOpen: (phaseId: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>, phaseId: string) => void;
  onEdit: (phase: ManagerPaymentPhaseRow) => void;
};

function PaymentPhaseCard({
  phase,
  position,
  onOpen,
  onKeyDown,
  onEdit,
}: PaymentPhaseCardProps) {
  return (
    <div
      className={PHASE_CARD_CLASS}
      tabIndex={0}
      role="link"
      aria-label={`View ${phase.name}`}
      onClick={() => onOpen(phase.id)}
      onKeyDown={(event) => onKeyDown(event, phase.id)}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold tabular-nums text-primary">
          {position}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <TruncatedCell
              value={phase.name}
              maxLength={32}
              className="font-medium"
            />
            <span className="shrink-0">
              <PaymentPhaseStatusBadge
                status={phase.status as PaymentPhaseStatus}
              />
            </span>
          </div>
          <div
            className="min-w-0 text-sm"
            onClick={(event) => event.stopPropagation()}
          >
            <Link
              href={getManagerSemesterDetailRoute(phase.semester_id)}
              className="text-primary hover:underline"
            >
              <TruncatedCell value={phase.semester_name} maxLength={36} />
            </Link>
          </div>
        </div>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] leading-tight text-muted-foreground">
            Amount
          </p>
          <p className="truncate text-xl font-semibold tabular-nums tracking-tight">
            {formatPaymentPhaseMoney(phase.amount)}
          </p>
        </div>
        <div className="min-w-0 text-right">
          <p className="text-[11px] leading-tight text-muted-foreground">
            Upfront
          </p>
          <p className="truncate text-sm font-medium tabular-nums text-muted-foreground">
            {formatPaymentPhaseMoney(phase.upfront_amount)}
          </p>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t pt-3">
        <span className="inline-flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          <span>
            SPP paid{" "}
            <span className="font-medium tabular-nums text-foreground">
              {phase.spp_paid_count}/{phase.spp_active_count}
            </span>
          </span>
          {phase.upfront_window_active ? <UpfrontWindowChip /> : null}
        </span>
        <div
          className="flex items-center justify-end gap-0.5"
          onClick={(event) => event.stopPropagation()}
        >
          {phase.status !== PAYMENT_PHASE_STATUSES.CANCELLED ? (
            <Can permission={PERMISSIONS.ACCOUNTING_PAYMENT_PHASES_UPDATE}>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Edit ${phase.name}`}
                className="text-muted-foreground hover:text-foreground"
                onClick={() => onEdit(phase)}
              >
                <PencilIcon />
              </Button>
            </Can>
          ) : null}
          <Button
            render={
              <Link href={getManagerAccountingPhaseDetailRoute(phase.id)} />
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
      </div>
    </div>
  );
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
  const hasMounted = useHasMounted();
  const [activeTab, setActiveTab] = useState<ManagerAccountingTab>(
    MANAGER_ACCOUNTING_TABS.PHASES
  );
  const [hasRestoredTab, setHasRestoredTab] = useState(false);

  if (hasMounted && !hasRestoredTab) {
    setHasRestoredTab(true);
    setActiveTab(readManagerAccountingTab() ?? MANAGER_ACCOUNTING_TABS.PHASES);
  }

  const handleTabChange = (value: string) => {
    const tab = value as ManagerAccountingTab;
    setActiveTab(tab);
    writeManagerAccountingTab(tab);
  };

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
  const [viewMode, setViewMode] = usePersistedListViewMode(
    MANAGER_LIST_VIEW_MODE_STORAGE_KEYS.ACCOUNTING_PHASES
  );
  const isGridView = viewMode === MANAGER_LIST_VIEW_MODES.GRID;

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
    event: KeyboardEvent<HTMLElement>,
    phaseId: string
  ) => {
    // Enter/Space on a nested link or button must not also open the row.
    if (event.target !== event.currentTarget) {
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openPhaseDetails(phaseId);
    }
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6">
        <PanelPageHeader title="Accounting" />

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
          onValueChange={handleTabChange}
          className="flex flex-col gap-[80px]"
        >
          <div className="flex flex-col gap-3 @lg/panel:flex-row @lg/panel:items-center @lg/panel:justify-between">
            <TabsListPrimitive className="flex h-auto w-full flex-wrap items-center gap-2 rounded-full bg-muted/60 p-1 ring-1 ring-foreground/8 @lg/panel:w-fit">
              <TabsTriggerPrimitive value="phases" className={TAB_TRIGGER_CLASS}>
                Payment phases
              </TabsTriggerPrimitive>
              <TabsTriggerPrimitive value="timeline" className={TAB_TRIGGER_CLASS}>
                Timeline
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

            <div className="flex flex-wrap items-center gap-3 @lg/panel:justify-end">
              <SppPaidSummary
                paid={stats.sppPaidCount}
                active={stats.sppActiveCount}
              />
              <Can permission={PERMISSIONS.ACCOUNTING_PAYMENT_PHASES_CREATE}>
                <Button type="button" onClick={() => setIsCreateOpen(true)}>
                  <PlusIcon data-icon="inline-start" />
                  Create payment phase
                </Button>
              </Can>
            </div>
          </div>

          <TabsContentsPrimitive>
            <TabsContentPrimitive value="phases" className="outline-none">
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-3 @lg/panel:flex-row @lg/panel:items-center">
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
                    <SelectTrigger className="w-full @lg/panel:w-44" aria-label="Status">
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
                  <ListViewModeToggle
                    value={viewMode}
                    onChange={setViewMode}
                    label="Payment phases layout"
                    className="self-end @lg/panel:ml-auto @lg/panel:self-auto"
                  />
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
                ) : isGridView ? (
                  <div className="grid gap-3 @lg/panel:grid-cols-2 @4xl/panel:grid-cols-3">
                    {paginatedPhases.map((phase, index) => (
                      <PaymentPhaseCard
                        key={phase.id}
                        phase={phase}
                        position={rangeStart + index}
                        onOpen={openPhaseDetails}
                        onKeyDown={handlePhaseRowKeyDown}
                        onEdit={setEditPhase}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto overflow-hidden rounded-xl border">
                    <table className="w-full min-w-[900px] text-sm">
                      <thead>
                        <tr className="border-b bg-muted/40 text-left">
                          <th className="w-12 px-4 py-3 font-medium">#</th>
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
                        {paginatedPhases.map((phase, index) => (
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
                            <td className="px-4 py-3 text-muted-foreground tabular-nums">
                              {rangeStart + index}
                            </td>
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

                <div className="flex flex-col gap-3 @lg/panel:flex-row @lg/panel:items-center @lg/panel:justify-between">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span>
                      Showing {rangeStart}–{rangeEnd} of{" "}
                      {filteredPhases.length}
                    </span>
                    <span aria-hidden="true">·</span>
                    <div className="flex items-center gap-2">
                      <span>{isGridView ? "Cards" : "Rows"}</span>
                      <Select
                        value={String(pageSize)}
                        onValueChange={handlePageSizeChange}
                      >
                        <SelectTrigger
                          size="sm"
                          className="w-16"
                          aria-label={
                            isGridView ? "Cards per page" : "Rows per page"
                          }
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

            <TabsContentPrimitive value="timeline" className="outline-none">
              <div className="flex flex-col gap-4">
                <div className="grid gap-4 @lg/panel:grid-cols-2 @4xl/panel:grid-cols-4">
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
