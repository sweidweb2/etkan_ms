"use client";

import { DetailField } from "@/components/manager/shared/detail-field";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useActionState,
  useMemo,
  useState,
  useTransition,
  type KeyboardEvent,
} from "react";
import { format } from "date-fns";
import {
  BanIcon,
  BanknoteIcon,
  CalendarCheckIcon,
  CalendarXIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  InfoIcon,
  PencilIcon,
  ArrowRightLeftIcon,
  SearchIcon,
  UsersIcon,
} from "lucide-react";
import { cancelPaymentPhaseAction } from "@/app/manager/accounting/actions";
import { Can } from "@/components/auth/can";
import {
  getPageNumbers,
  STATUS_FILTER_ALL,
  TruncatedCell,
} from "@/components/manager/accounting/accounting-table-shared";
import { BulkCreateSppClearancesDialog } from "@/components/manager/accounting/bulk-create-spp-clearances-dialog";
import { BulkDeleteSppClearancesDialog } from "@/components/manager/accounting/bulk-delete-spp-clearances-dialog";
import { CreateStudentPaymentDialog } from "@/components/manager/accounting/create-student-payment-dialog";
import { EditPaymentPhaseDialog } from "@/components/manager/accounting/edit-payment-phase-dialog";
import { PaymentPhaseStatusBadge } from "@/components/manager/accounting/payment-phase-status-badge";
import { SppCurrentBadge } from "@/components/manager/accounting/spp-current-badge";
import { SppStatusBadge } from "@/components/manager/accounting/spp-status-badge";
import { TransferSppDialog } from "@/components/manager/accounting/transfer-spp-dialog";
import { UpfrontWindowChip } from "@/components/manager/accounting/upfront-window-chip";
import { UpsertSppClearanceDialog } from "@/components/manager/accounting/upsert-spp-clearance-dialog";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  formatPaymentPhaseMoney,
  SPP_STATUS_LABELS,
} from "@/lib/constants/manager-payment-phase-display";
import { resolveSppDisplayStatus } from "@/lib/manager/accounting/spp-display-status";
import { ListViewModeToggle } from "@/components/manager/shared/list-view-mode-toggle";
import {
  MANAGER_LIST_VIEW_MODES,
  MANAGER_LIST_VIEW_MODE_STORAGE_KEYS,
} from "@/lib/constants/manager-list-view-mode";
import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  getManagerAccountingSppDetailRoute,
  getManagerClassDetailRoute,
  getManagerSemesterDetailRoute,
  getManagerStudentDetailRoute,
  ROUTES,
} from "@/lib/constants/routes";
import {
  PAYMENT_PHASE_STATUSES,
  STUDENT_PAYMENT_PHASE_STATUSES,
  STUDENT_PAYMENT_PHASE_STATUS_VALUES,
  type StudentPaymentPhaseStatus,
} from "@/lib/manager/accounting/constants";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { usePersistedListViewMode } from "@/hooks/use-persisted-list-view-mode";
import { cn } from "@/lib/utils";
import type {
  CancelPaymentPhaseActionState,
  ManagerPaymentPhaseRow,
  ManagerSppRow,
} from "@/types/manager-payment-phase";
import { applySppFinancialSnapshot } from "@/lib/manager/accounting/apply-spp-financial-snapshot";
import type {
  ManagerSppFinancialSnapshot,
  ManagerStudentPaymentRow,
} from "@/types/manager-student-payment";

const SPP_PAGE_SIZE = 20;
const SPP_MAX_PAGES = 100;
const SPP_MAX_VISIBLE = SPP_PAGE_SIZE * SPP_MAX_PAGES;

function applySppRowFinancials(
  spp: ManagerSppRow,
  snapshot: ManagerSppFinancialSnapshot
): ManagerSppRow {
  return applySppFinancialSnapshot(spp, snapshot);
}

const initialCancelState: CancelPaymentPhaseActionState = {};

const SPP_ROW_CLASS =
  "cursor-pointer border-b last:border-b-0 transition-all duration-150 hover:bg-primary/10 hover:shadow-[inset_4px_0_0_0_var(--primary)] active:bg-primary/15 focus-visible:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset";

const SPP_CARD_CLASS =
  "group flex cursor-pointer flex-col gap-4 rounded-xl border bg-card p-4 shadow-xs transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md active:translate-y-0 active:bg-primary/5 focus-visible:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const STATUS_FILTER_SELECT_ITEMS = [
  { value: STATUS_FILTER_ALL, label: "All statuses" },
  ...STUDENT_PAYMENT_PHASE_STATUS_VALUES.map((status) => ({
    value: status,
    label: SPP_STATUS_LABELS[status],
  })),
];

type PaymentPhaseDetailsPanelProps = {
  phase: ManagerPaymentPhaseRow;
  initialSpps: ManagerSppRow[];
  transferPhaseOptions: ManagerPaymentPhaseRow[];
};

function matchesSppSearch(spp: ManagerSppRow, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  return spp.student_label.toLowerCase().includes(normalizedQuery);
}

function SppStudentName({
  spp,
  maxLength,
}: {
  spp: ManagerSppRow;
  maxLength: number;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="min-w-0 flex-1">
        {spp.student_profile_id ? (
          <Link
            href={getManagerStudentDetailRoute(spp.student_profile_id)}
            className="text-primary hover:underline"
          >
            <TruncatedCell value={spp.student_label} maxLength={maxLength} />
          </Link>
        ) : (
          <TruncatedCell value={spp.student_label} maxLength={maxLength} />
        )}
      </div>
      {spp.remaining_amount < 0 ? (
        <span className="inline-flex shrink-0 items-center rounded-md bg-violet-500/15 px-2 py-0.5 text-xs font-medium text-violet-700 dark:text-violet-300">
          Refund
        </span>
      ) : null}
      {spp.drop_refund_owed ? (
        <span className="inline-flex shrink-0 items-center rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-200">
          Refund
        </span>
      ) : null}
    </div>
  );
}

function SppStatusBadges({
  spp,
  phase,
}: {
  spp: ManagerSppRow;
  phase: ManagerPaymentPhaseRow;
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <SppStatusBadge
        status={resolveSppDisplayStatus(
          { status: spp.status, totalPaid: spp.total_paid },
          {
            upfrontWindowActive: phase.upfront_window_active,
            upfrontAmount: phase.upfront_amount,
          }
        )}
      />
      <SppCurrentBadge clearance={spp.current_clearance} />
      {spp.drop_dropped ? (
        <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          Dropped
        </span>
      ) : null}
      {spp.drop_done_paid ? (
        <span className="inline-flex items-center rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
          Done paid
        </span>
      ) : null}
      {spp.drop_pending ? (
        <span className="inline-flex items-center rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-200">
          Pending drop
        </span>
      ) : null}
    </span>
  );
}

type SppActionsProps = {
  spp: ManagerSppRow;
  phaseId: string;
  canRecordPayments: boolean;
  onRecordPayment: (sppId: string) => void;
  onEditClearance: (spp: ManagerSppRow) => void;
  onTransfer: (spp: ManagerSppRow) => void;
};

function SppActions({
  spp,
  phaseId,
  canRecordPayments,
  onRecordPayment,
  onEditClearance,
  onTransfer,
}: SppActionsProps) {
  return (
    <div className="flex items-center justify-end gap-1">
      {canRecordPayments &&
      spp.status !== STUDENT_PAYMENT_PHASE_STATUSES.CANCELLED &&
      spp.status !== STUDENT_PAYMENT_PHASE_STATUSES.PAID &&
      !spp.drop_dropped ? (
        <Can permission={PERMISSIONS.ACCOUNTING_PAYMENTS_CREATE}>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Record payment for ${spp.student_label}`}
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => onRecordPayment(spp.id)}
                />
              }
            >
              <BanknoteIcon />
            </TooltipTrigger>
            <TooltipContent>Record payment</TooltipContent>
          </Tooltip>
        </Can>
      ) : null}
      {spp.status !== STUDENT_PAYMENT_PHASE_STATUSES.PAID &&
      spp.status !== STUDENT_PAYMENT_PHASE_STATUSES.CANCELLED ? (
        <Can
          permission={
            spp.current_clearance
              ? PERMISSIONS.ACCOUNTING_CLEARANCES_UPDATE
              : PERMISSIONS.ACCOUNTING_CLEARANCES_CREATE
          }
        >
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={
                    spp.current_clearance
                      ? `Edit Month paid marker for ${spp.student_label}`
                      : `Set Month paid marker for ${spp.student_label}`
                  }
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => onEditClearance(spp)}
                />
              }
            >
              <CalendarCheckIcon />
            </TooltipTrigger>
            <TooltipContent>
              {spp.current_clearance ? "Edit Month paid" : "Set Month paid"}
            </TooltipContent>
          </Tooltip>
        </Can>
      ) : null}
      {spp.status !== STUDENT_PAYMENT_PHASE_STATUSES.CANCELLED &&
      !spp.drop_dropped ? (
        <Can permission={PERMISSIONS.ACCOUNTING_SPP_TRANSFER}>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Transfer payment phase for ${spp.student_label}`}
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => onTransfer(spp)}
                />
              }
            >
              <ArrowRightLeftIcon />
            </TooltipTrigger>
            <TooltipContent>Transfer payment phase</TooltipContent>
          </Tooltip>
        </Can>
      ) : null}
      <Button
        render={
          <Link href={getManagerAccountingSppDetailRoute(phaseId, spp.id)} />
        }
        nativeButton={false}
        variant="ghost"
        size="icon-sm"
        aria-label={`View assignment for ${spp.student_label}`}
        className="text-muted-foreground hover:text-foreground"
      >
        <EyeIcon />
      </Button>
    </div>
  );
}

function SppAmountStat({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className="min-w-0 rounded-lg bg-muted/40 px-2.5 py-2">
      <dt className="text-[11px] leading-tight text-muted-foreground">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-0.5 truncate text-sm font-medium tabular-nums",
          className
        )}
      >
        {formatPaymentPhaseMoney(value)}
      </dd>
    </div>
  );
}

type SppCardProps = Omit<SppActionsProps, "phaseId"> & {
  phase: ManagerPaymentPhaseRow;
  position: number;
  onOpen: (sppId: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>, sppId: string) => void;
};

function SppCard({
  spp,
  phase,
  position,
  onOpen,
  onKeyDown,
  ...actionProps
}: SppCardProps) {
  const isCredit = spp.remaining_amount < 0;
  const paidRatio =
    spp.final_amount_due > 0
      ? Math.min(1, Math.max(0, spp.total_paid / spp.final_amount_due))
      : 1;
  const paidPercent = Math.round(paidRatio * 100);

  return (
    <div
      className={SPP_CARD_CLASS}
      tabIndex={0}
      role="link"
      aria-label={`View assignment for ${spp.student_label}`}
      onClick={() => onOpen(spp.id)}
      onKeyDown={(event) => onKeyDown(event, spp.id)}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold tabular-nums text-primary">
          {position}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div
            className="font-medium"
            onClick={(event) => event.stopPropagation()}
          >
            <SppStudentName spp={spp} maxLength={32} />
          </div>
          <SppStatusBadges spp={spp} phase={phase} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] leading-tight text-muted-foreground">
              Remaining
            </p>
            <p
              className={cn(
                "truncate text-xl font-semibold tabular-nums tracking-tight",
                isCredit && "text-violet-700 dark:text-violet-300"
              )}
            >
              {formatPaymentPhaseMoney(spp.remaining_amount)}
            </p>
          </div>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {paidPercent}% paid
          </span>
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label={`Paid ${paidPercent}%`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={paidPercent}
        >
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-300",
              isCredit
                ? "bg-violet-500"
                : paidRatio >= 1
                  ? "bg-emerald-500"
                  : "bg-primary"
            )}
            style={{ width: `${paidPercent}%` }}
          />
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-2">
        <SppAmountStat label="Original" value={spp.original_amount} />
        <SppAmountStat
          label="Adjustment"
          value={spp.adjustment_amount}
          className="text-muted-foreground"
        />
        <SppAmountStat label="Due" value={spp.final_amount_due} />
        <SppAmountStat label="Paid" value={spp.total_paid} />
      </dl>

      <div className="mt-auto flex items-center justify-between gap-2 border-t pt-3">
        <span className="text-xs text-muted-foreground transition-colors group-hover:text-primary">
          View details
        </span>
        <div onClick={(event) => event.stopPropagation()}>
          <SppActions spp={spp} phaseId={phase.id} {...actionProps} />
        </div>
      </div>
    </div>
  );
}

export function PaymentPhaseDetailsPanel({
  phase: initialPhase,
  initialSpps,
  transferPhaseOptions,
}: PaymentPhaseDetailsPanelProps) {
  const router = useRouter();
  const [phase, setPhase] = useState(initialPhase);
  const [prevPhase, setPrevPhase] = useState(initialPhase);
  const [spps, setSpps] = useState(initialSpps);
  const [prevSpps, setPrevSpps] = useState(initialSpps);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [recordPaymentSppId, setRecordPaymentSppId] = useState<string | null>(
    null
  );
  const [isBulkClearanceOpen, setIsBulkClearanceOpen] = useState(false);
  const [isBulkClearanceDeleteOpen, setIsBulkClearanceDeleteOpen] =
    useState(false);
  const [clearanceTargetSpp, setClearanceTargetSpp] =
    useState<ManagerSppRow | null>(null);
  const [transferringSpp, setTransferringSpp] = useState<ManagerSppRow | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(STATUS_FILTER_ALL);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = usePersistedListViewMode(
    MANAGER_LIST_VIEW_MODE_STORAGE_KEYS.ACCOUNTING_SPP
  );
  const isGridView = viewMode === MANAGER_LIST_VIEW_MODES.GRID;
  const [isTransitionPending, startTransition] = useTransition();
  const [cancelState, cancelAction, isCancelPending] = useActionState(
    cancelPaymentPhaseAction,
    initialCancelState
  );
  const isCancelActionPending = isCancelPending || isTransitionPending;
  const handleCancelOpenChange = usePendingAwareOpenChange(
    isCancelActionPending,
    setIsCancelOpen
  );

  useActionStateToast(cancelState, isCancelActionPending);
  useActionStateSuccess(cancelState, isCancelActionPending, (nextState) => {
    if (nextState.phase) {
      setPhase(nextState.phase);
    }
    setIsCancelOpen(false);
  });

  if (initialPhase !== prevPhase) {
    setPrevPhase(initialPhase);
    setPhase(initialPhase);
  }

  if (initialSpps !== prevSpps) {
    setPrevSpps(initialSpps);
    setSpps(initialSpps);
  }

  const isCancelled = phase.status === PAYMENT_PHASE_STATUSES.CANCELLED;
  const canRecordPayments = !isCancelled;

  const { canBulkSetMonthPaid, canBulkRemoveMonthPaid, monthPaidMarkerCount } =
    useMemo(() => {
      const eligibleForSet = spps.filter(
        (spp) =>
          spp.status !== STUDENT_PAYMENT_PHASE_STATUSES.PAID &&
          spp.status !== STUDENT_PAYMENT_PHASE_STATUSES.CANCELLED
      );
      const withMarker = spps.filter((spp) => spp.current_clearance);
      return {
        canBulkSetMonthPaid: eligibleForSet.some(
          (spp) => !spp.current_clearance
        ),
        canBulkRemoveMonthPaid: withMarker.length > 0,
        monthPaidMarkerCount: withMarker.length,
      };
    }, [spps]);

  const openRecordPayment = (sppId: string) => {
    setRecordPaymentSppId(sppId);
  };

  const handlePaymentCreated = (
    _payment: ManagerStudentPaymentRow,
    snapshot: ManagerSppFinancialSnapshot
  ) => {
    setRecordPaymentSppId(null);
    setSpps((current) =>
      current.map((spp) =>
        spp.id === snapshot.id ? applySppRowFinancials(spp, snapshot) : spp
      )
    );
  };

  const filteredSpps = useMemo(() => {
    return spps.filter((spp) => {
      const matchesStatus =
        statusFilter === STATUS_FILTER_ALL || spp.status === statusFilter;
      return matchesStatus && matchesSppSearch(spp, searchQuery);
    });
  }, [spps, searchQuery, statusFilter]);

  const visibleCount = Math.min(filteredSpps.length, SPP_MAX_VISIBLE);
  const isOverPageCap = filteredSpps.length > SPP_MAX_VISIBLE;
  const totalPages = Math.max(1, Math.ceil(visibleCount / SPP_PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedSpps = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * SPP_PAGE_SIZE;
    return filteredSpps.slice(startIndex, startIndex + SPP_PAGE_SIZE);
  }, [filteredSpps, safeCurrentPage]);

  const pageNumbers = getPageNumbers(safeCurrentPage, totalPages);
  const rangeStart =
    visibleCount === 0 ? 0 : (safeCurrentPage - 1) * SPP_PAGE_SIZE + 1;
  const rangeEnd = Math.min(safeCurrentPage * SPP_PAGE_SIZE, visibleCount);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (value: string | null) => {
    setStatusFilter(value ?? STATUS_FILTER_ALL);
    setCurrentPage(1);
  };

  const openFromInfoSheet = (open: () => void) => {
    setIsInfoOpen(false);
    open();
  };

  const handlePhaseUpdated = (updated: ManagerPaymentPhaseRow) => {
    setPhase(updated);
  };

  const openSppDetails = (sppId: string) => {
    router.push(getManagerAccountingSppDetailRoute(phase.id, sppId));
  };

  const handleSppRowKeyDown = (
    event: KeyboardEvent<HTMLElement>,
    sppId: string
  ) => {
    // Enter/Space on a nested link or button must not also open the row.
    if (event.target !== event.currentTarget) {
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openSppDetails(sppId);
    }
  };

  function handleConfirmCancel() {
    const formData = new FormData();
    formData.set("payment_phase_id", phase.id);
    startTransition(() => {
      cancelAction(formData);
    });
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Breadcrumb className="min-w-0">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href={ROUTES.MANAGER_ACCOUNTING}>
                  Accounting
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{phase.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsInfoOpen(true)}
          >
            <InfoIcon data-icon="inline-start" />
            Phase details
          </Button>
        </div>

        <EditPaymentPhaseDialog
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          phase={phase}
          onUpdated={handlePhaseUpdated}
        />

        <CreateStudentPaymentDialog
          key={recordPaymentSppId ?? "closed"}
          open={recordPaymentSppId !== null}
          onOpenChange={(open) => {
            if (!open) {
              setRecordPaymentSppId(null);
            }
          }}
          sppId={recordPaymentSppId ?? ""}
          maxAmount={phase.amount}
          onCreated={handlePaymentCreated}
        />

        <TransferSppDialog
          open={transferringSpp !== null}
          onOpenChange={(open) => {
            if (!open) {
              setTransferringSpp(null);
            }
          }}
          spp={transferringSpp}
          sourcePhaseId={phase.id}
          sourceSemesterId={phase.semester_id}
          phases={transferPhaseOptions}
          onTransferred={(sppId) => {
            setTransferringSpp(null);
            setSpps((current) => current.filter((spp) => spp.id !== sppId));
          }}
        />

        <BulkCreateSppClearancesDialog
          open={isBulkClearanceOpen}
          onOpenChange={setIsBulkClearanceOpen}
          paymentPhaseId={phase.id}
          onCreated={() => {
            router.refresh();
          }}
        />

        <BulkDeleteSppClearancesDialog
          open={isBulkClearanceDeleteOpen}
          onOpenChange={setIsBulkClearanceDeleteOpen}
          paymentPhaseId={phase.id}
          markerCount={monthPaidMarkerCount}
          onDeleted={() => {
            setSpps((current) =>
              current.map((row) =>
                row.current_clearance
                  ? { ...row, current_clearance: null }
                  : row
              )
            );
            router.refresh();
          }}
        />

        <UpsertSppClearanceDialog
          key={clearanceTargetSpp?.id ?? "clearance-closed"}
          open={clearanceTargetSpp !== null}
          onOpenChange={(open) => {
            if (!open) {
              setClearanceTargetSpp(null);
            }
          }}
          sppId={clearanceTargetSpp?.id ?? ""}
          paymentPhaseId={phase.id}
          clearance={clearanceTargetSpp?.current_clearance ?? null}
          onSaved={(clearance) => {
            const sppId = clearanceTargetSpp?.id;
            if (!sppId) {
              return;
            }
            setSpps((current) =>
              current.map((row) =>
                row.id === sppId
                  ? { ...row, current_clearance: clearance }
                  : row
              )
            );
            setClearanceTargetSpp(null);
          }}
        />

        <Dialog open={isCancelOpen} onOpenChange={handleCancelOpenChange}>
          <DialogContent
            className="sm:max-w-md"
            showCloseButton={!isCancelActionPending}
          >
            <DialogHeader>
              <DialogTitle>Cancel payment phase</DialogTitle>
              <DialogDescription>
                Cancel {phase.name}? Existing student assignments and payments
                stay as-is. New payments will be blocked.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleCancelOpenChange(false)}
                disabled={isCancelActionPending}
              >
                Keep open
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleConfirmCancel}
                disabled={isCancelActionPending}
              >
                {isCancelActionPending ? <InlineSpinner /> : null}
                Cancel phase
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Sheet open={isInfoOpen} onOpenChange={setIsInfoOpen}>
          <SheetContent
            side="right"
            className="w-full overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-md"
          >
            <SheetHeader className="pr-12">
              <SheetTitle>{phase.name}</SheetTitle>
              <SheetDescription>Payment phase details</SheetDescription>
            </SheetHeader>
            <dl className="grid gap-4 px-4 sm:grid-cols-2">
              <DetailField label="Semester">
                <Link
                  href={getManagerSemesterDetailRoute(phase.semester_id)}
                  className="font-medium text-primary hover:underline"
                >
                  {phase.semester_name}
                </Link>
              </DetailField>
              <DetailField label="Semester code" value={phase.semester_code} />
              {phase.billing_class_id && phase.billing_class_name ? (
                <DetailField label="Billing class">
                  <Link
                    href={getManagerClassDetailRoute(phase.billing_class_id)}
                    className="font-medium text-primary hover:underline"
                  >
                    {phase.billing_class_name}
                  </Link>
                </DetailField>
              ) : (
                <DetailField label="Billing class" value="—" />
              )}
              <DetailField label="Status">
                <PaymentPhaseStatusBadge status={phase.status} />
              </DetailField>
              <DetailField
                label="Amount"
                value={formatPaymentPhaseMoney(phase.amount)}
              />
              <DetailField
                label="Upfront"
                value={formatPaymentPhaseMoney(phase.upfront_amount)}
              />
              <DetailField
                label="Duration"
                value={`${phase.duration_months} month${phase.duration_months === 1 ? "" : "s"}`}
              />
              <DetailField
                label="Start"
                value={format(new Date(phase.start_date), "MMM d, yyyy")}
              />
              <DetailField
                label="End"
                value={format(new Date(phase.end_date), "MMM d, yyyy")}
              />
              <DetailField
                label="Created"
                value={format(new Date(phase.created_at), "MMM d, yyyy")}
              />
              <DetailField label="SPP paid / active">
                <span className="inline-flex items-center gap-2">
                  <span>
                    {phase.spp_paid_count}/{phase.spp_active_count}
                  </span>
                  {phase.upfront_window_active ? <UpfrontWindowChip /> : null}
                </span>
              </DetailField>
            </dl>
            {!isCancelled ? (
              <SheetFooter className="flex-row flex-wrap justify-end border-t">
                <Can permission={PERMISSIONS.ACCOUNTING_PAYMENT_PHASES_UPDATE}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openFromInfoSheet(() => setIsEditOpen(true))}
                  >
                    <PencilIcon data-icon="inline-start" />
                    Edit
                  </Button>
                </Can>
                <Can permission={PERMISSIONS.ACCOUNTING_PAYMENT_PHASES_CANCEL}>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() =>
                      openFromInfoSheet(() => setIsCancelOpen(true))
                    }
                  >
                    <BanIcon data-icon="inline-start" />
                    Cancel phase
                  </Button>
                </Can>
              </SheetFooter>
            ) : null}
          </SheetContent>
        </Sheet>

        <Card className="py-0">
          <CardHeader className="border-b py-3">
            <CardTitle>Student payment phases</CardTitle>
            <CardAction className="flex flex-wrap items-center gap-2">
              <Can permission={PERMISSIONS.ACCOUNTING_CLEARANCES_CREATE}>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!canBulkSetMonthPaid}
                  onClick={() => setIsBulkClearanceOpen(true)}
                >
                  <CalendarCheckIcon data-icon="inline-start" />
                  Bulk set Month paid
                </Button>
              </Can>
              <Can permission={PERMISSIONS.ACCOUNTING_CLEARANCES_DELETE}>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!canBulkRemoveMonthPaid}
                  onClick={() => setIsBulkClearanceDeleteOpen(true)}
                >
                  <CalendarXIcon data-icon="inline-start" />
                  Bulk remove Month paid
                </Button>
              </Can>
            </CardAction>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="flex flex-col gap-3 border-b px-4 pt-2 pb-3 @lg/panel:flex-row @lg/panel:items-center">
              <div className="relative max-w-md flex-1">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  placeholder="Search student…"
                  className="pl-8"
                  aria-label="Search student payment phases"
                />
              </div>
              <Select
                value={statusFilter}
                items={STATUS_FILTER_SELECT_ITEMS}
                onValueChange={handleStatusFilterChange}
              >
                <SelectTrigger className="w-full @lg/panel:w-44" aria-label="Status">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent align="start">
                  <SelectItem value={STATUS_FILTER_ALL}>All statuses</SelectItem>
                  {STUDENT_PAYMENT_PHASE_STATUS_VALUES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {SPP_STATUS_LABELS[status as StudentPaymentPhaseStatus]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <ListViewModeToggle
                value={viewMode}
                onChange={setViewMode}
                label="Student payment phases layout"
                className="self-end @lg/panel:ml-auto @lg/panel:self-auto"
              />
            </div>

            {paginatedSpps.length === 0 ? (
              <div className="px-4 py-4">
                <EmptyState
                  size="sm"
                  icon={spps.length === 0 ? UsersIcon : SearchIcon}
                  title={
                    spps.length === 0
                      ? "No student payment phases assigned yet"
                      : "No students match your filters"
                  }
                  description={
                    spps.length === 0
                      ? "Assignments appear when students are billed for this phase."
                      : "Try a different search or status."
                  }
                />
              </div>
            ) : isGridView ? (
              <div className="grid gap-3 p-4 @lg/panel:grid-cols-2 @4xl/panel:grid-cols-3">
                {paginatedSpps.map((spp, index) => (
                  <SppCard
                    key={spp.id}
                    spp={spp}
                    phase={phase}
                    position={rangeStart + index}
                    canRecordPayments={canRecordPayments}
                    onOpen={openSppDetails}
                    onKeyDown={handleSppRowKeyDown}
                    onRecordPayment={openRecordPayment}
                    onEditClearance={setClearanceTargetSpp}
                    onTransfer={setTransferringSpp}
                  />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1040px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left">
                      <th className="w-12 px-4 py-3 font-medium">#</th>
                      <th className="px-4 py-3 font-medium">Student</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium text-right">
                        Original
                      </th>
                      <th className="px-4 py-3 font-medium text-right">
                        Adjustment
                      </th>
                      <th className="px-4 py-3 font-medium text-right">Due</th>
                      <th className="px-4 py-3 font-medium text-right">Paid</th>
                      <th className="px-4 py-3 font-medium text-right">
                        Remaining
                      </th>
                      <th className="px-4 py-3 font-medium text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedSpps.map((spp, index) => (
                      <tr
                        key={spp.id}
                        className={SPP_ROW_CLASS}
                        tabIndex={0}
                        role="link"
                        aria-label={`View assignment for ${spp.student_label}`}
                        onClick={() => openSppDetails(spp.id)}
                        onKeyDown={(event) =>
                          handleSppRowKeyDown(event, spp.id)
                        }
                      >
                        <td className="px-4 py-3 text-muted-foreground tabular-nums">
                          {rangeStart + index}
                        </td>
                        <td
                          className="max-w-[18rem] px-4 py-3 font-medium"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <SppStudentName spp={spp} maxLength={28} />
                        </td>
                        <td className="px-4 py-3">
                          <SppStatusBadges spp={spp} phase={phase} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                          {formatPaymentPhaseMoney(spp.original_amount)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-muted-foreground">
                          {formatPaymentPhaseMoney(spp.adjustment_amount)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                          {formatPaymentPhaseMoney(spp.final_amount_due)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                          {formatPaymentPhaseMoney(spp.total_paid)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                          <span className="inline-flex items-center justify-end gap-2">
                            {formatPaymentPhaseMoney(spp.remaining_amount)}
                            {spp.remaining_amount < 0 ? (
                              <span className="inline-flex items-center rounded-md bg-violet-500/15 px-2 py-0.5 text-xs font-medium text-violet-700 dark:text-violet-300">
                                Credit
                              </span>
                            ) : null}
                          </span>
                        </td>
                        <td
                          className="px-4 py-3"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <SppActions
                            spp={spp}
                            phaseId={phase.id}
                            canRecordPayments={canRecordPayments}
                            onRecordPayment={openRecordPayment}
                            onEditClearance={setClearanceTargetSpp}
                            onTransfer={setTransferringSpp}
                          />
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
                  Showing {rangeStart}–{rangeEnd} of {filteredSpps.length}
                </span>
                {isOverPageCap ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>
                      First {SPP_MAX_VISIBLE.toLocaleString()} shown. Search to
                      narrow the list.
                    </span>
                  </>
                ) : null}
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
      </div>
    </TooltipProvider>
  );
}
