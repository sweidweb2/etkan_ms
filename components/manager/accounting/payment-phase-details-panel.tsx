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
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  PencilIcon,
  ArrowRightLeftIcon,
  SearchIcon,
} from "lucide-react";
import { cancelPaymentPhaseAction } from "@/app/manager/accounting/actions";
import { Can } from "@/components/auth/can";
import { CreateStudentPaymentDialog } from "@/components/manager/accounting/create-student-payment-dialog";
import { EditPaymentPhaseDialog } from "@/components/manager/accounting/edit-payment-phase-dialog";
import { PaymentPhaseStatusBadge } from "@/components/manager/accounting/payment-phase-status-badge";
import { SppStatusBadge } from "@/components/manager/accounting/spp-status-badge";
import { TransferSppDialog } from "@/components/manager/accounting/transfer-spp-dialog";
import { UpfrontWindowChip } from "@/components/manager/accounting/upfront-window-chip";
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
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import type {
  CancelPaymentPhaseActionState,
  ManagerPaymentPhaseRow,
  ManagerSppRow,
} from "@/types/manager-payment-phase";
import type {
  ManagerSppFinancialSnapshot,
  ManagerStudentPaymentRow,
} from "@/types/manager-student-payment";

function applySppRowFinancials(
  spp: ManagerSppRow,
  snapshot: ManagerSppFinancialSnapshot
): ManagerSppRow {
  return {
    ...spp,
    status: snapshot.status,
    original_amount: snapshot.original_amount,
    adjustment_amount: snapshot.adjustment_amount,
    final_amount_due: snapshot.final_amount_due,
    total_paid: snapshot.total_paid,
    remaining_amount: snapshot.remaining_amount,
  };
}

const PAGE_SIZE_OPTIONS = [5, 10, 25] as const;
const STATUS_FILTER_ALL = "all";
const initialCancelState: CancelPaymentPhaseActionState = {};

const SPP_ROW_CLASS =
  "cursor-pointer border-b last:border-b-0 transition-all duration-150 hover:bg-primary/10 hover:shadow-[inset_4px_0_0_0_var(--primary)] active:bg-primary/15 focus-visible:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset";

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

function matchesSppSearch(spp: ManagerSppRow, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  return spp.student_label.toLowerCase().includes(normalizedQuery);
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
  const [recordPaymentSppId, setRecordPaymentSppId] = useState<string | null>(
    null
  );
  const [transferringSpp, setTransferringSpp] = useState<ManagerSppRow | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(STATUS_FILTER_ALL);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(
    10
  );
  const [currentPage, setCurrentPage] = useState(1);
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

  const totalPages = Math.max(1, Math.ceil(filteredSpps.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedSpps = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return filteredSpps.slice(startIndex, startIndex + pageSize);
  }, [filteredSpps, pageSize, safeCurrentPage]);

  const pageNumbers = getPageNumbers(safeCurrentPage, totalPages);
  const rangeStart =
    filteredSpps.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safeCurrentPage * pageSize, filteredSpps.length);

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

  const handlePhaseUpdated = (updated: ManagerPaymentPhaseRow) => {
    setPhase(updated);
  };

  const openSppDetails = (sppId: string) => {
    router.push(getManagerAccountingSppDetailRoute(phase.id, sppId));
  };

  const handleSppRowKeyDown = (
    event: KeyboardEvent<HTMLTableRowElement>,
    sppId: string
  ) => {
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
        <Breadcrumb>
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

        <Card>
          <CardHeader>
            <CardTitle>{phase.name}</CardTitle>
            <CardAction className="flex flex-wrap gap-2">
              {!isCancelled ? (
                <Can permission={PERMISSIONS.ACCOUNTING_PAYMENT_PHASES_UPDATE}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditOpen(true)}
                  >
                    <PencilIcon data-icon="inline-start" />
                    Edit
                  </Button>
                </Can>
              ) : null}
              {!isCancelled ? (
                <Can permission={PERMISSIONS.ACCOUNTING_PAYMENT_PHASES_CANCEL}>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => setIsCancelOpen(true)}
                  >
                    <BanIcon data-icon="inline-start" />
                    Cancel phase
                  </Button>
                </Can>
              ) : null}
            </CardAction>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
          </CardContent>
        </Card>

        <Card className="py-0">
          <CardHeader className="border-b py-3">
            <CardTitle>Student payment phases</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="flex flex-col gap-3 border-b px-4 pt-2 pb-3 sm:flex-row sm:items-center">
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
                <SelectTrigger className="w-full sm:w-44" aria-label="Status">
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
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
                    <th className="px-4 py-3 font-medium">Student</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Original</th>
                    <th className="px-4 py-3 font-medium text-right">
                      Adjustment
                    </th>
                    <th className="px-4 py-3 font-medium text-right">Due</th>
                    <th className="px-4 py-3 font-medium text-right">Paid</th>
                    <th className="px-4 py-3 font-medium text-right">
                      Remaining
                    </th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedSpps.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-10 text-center text-muted-foreground"
                      >
                        {spps.length === 0
                          ? "No student payment phases assigned yet."
                          : "No students match your filters."}
                      </td>
                    </tr>
                  ) : (
                    paginatedSpps.map((spp) => (
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
                        <td
                          className="max-w-[18rem] px-4 py-3 font-medium"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <div className="min-w-0 flex-1">
                              {spp.student_profile_id ? (
                                <Link
                                  href={getManagerStudentDetailRoute(
                                    spp.student_profile_id
                                  )}
                                  className="text-primary hover:underline"
                                >
                                  <TruncatedCell
                                    value={spp.student_label}
                                    maxLength={28}
                                  />
                                </Link>
                              ) : (
                                <TruncatedCell
                                  value={spp.student_label}
                                  maxLength={28}
                                />
                              )}
                            </div>
                            {spp.remaining_amount < 0 ? (
                              <span className="inline-flex shrink-0 items-center rounded-md bg-violet-500/15 px-2 py-0.5 text-xs font-medium text-violet-700 dark:text-violet-300">
                                Refund
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <SppStatusBadge
                            status={resolveSppDisplayStatus(
                              {
                                status: spp.status,
                                totalPaid: spp.total_paid,
                              },
                              {
                                upfrontWindowActive: phase.upfront_window_active,
                                upfrontAmount: phase.upfront_amount,
                              }
                            )}
                          />
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
                          <div className="flex items-center justify-end gap-1">
                            {canRecordPayments &&
                            spp.status !==
                              STUDENT_PAYMENT_PHASE_STATUSES.CANCELLED ? (
                              <Can
                                permission={
                                  PERMISSIONS.ACCOUNTING_PAYMENTS_CREATE
                                }
                              >
                                <Tooltip>
                                  <TooltipTrigger
                                    render={
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        aria-label={`Record payment for ${spp.student_label}`}
                                        className="text-muted-foreground hover:text-foreground"
                                        onClick={() =>
                                          openRecordPayment(spp.id)
                                        }
                                      />
                                    }
                                  >
                                    <BanknoteIcon />
                                  </TooltipTrigger>
                                  <TooltipContent>Record payment</TooltipContent>
                                </Tooltip>
                              </Can>
                            ) : null}
                            {spp.status !==
                            STUDENT_PAYMENT_PHASE_STATUSES.CANCELLED ? (
                              <Can
                                permission={PERMISSIONS.ACCOUNTING_SPP_TRANSFER}
                              >
                                <Tooltip>
                                  <TooltipTrigger
                                    render={
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        aria-label={`Transfer payment phase for ${spp.student_label}`}
                                        className="text-muted-foreground hover:text-foreground"
                                        onClick={() => setTransferringSpp(spp)}
                                      />
                                    }
                                  >
                                    <ArrowRightLeftIcon />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Transfer payment phase
                                  </TooltipContent>
                                </Tooltip>
                              </Can>
                            ) : null}
                            <Button
                              render={
                                <Link
                                  href={getManagerAccountingSppDetailRoute(
                                    phase.id,
                                    spp.id
                                  )}
                                />
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
                  Showing {rangeStart}–{rangeEnd} of {filteredSpps.length}
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
      </div>
    </TooltipProvider>
  );
}
