"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MessageSquareTextIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react";
import { deletePaymentAction } from "@/app/manager/accounting/actions";
import { AddPaymentDialog } from "@/components/manager/accounting/add-payment-dialog";
import { EditPaymentDialog } from "@/components/manager/accounting/edit-payment-dialog";
import { PaymentDetailsDialog } from "@/components/manager/accounting/payment-details-dialog";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import {
  formatPaymentMethodLabel,
  MANAGER_PAYMENT_TABLE_LIMITS,
} from "@/lib/constants/manager-payment-display";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_VALUES,
  type PaymentMethodValue,
} from "@/lib/constants/manager-payment-methods";
import { formatAccountCurrency } from "@/lib/constants/manager-subscribed-semester-display";
import {
  getBillingMutationLockMessage,
  type SubscriptionBillingGate,
} from "@/lib/manager/subscribed-semester-billing";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import type { AccountingMutationActionState } from "@/types/manager-accounting";
import type { ManagerStudentPaymentRow } from "@/types/manager-student-account";

const PAGE_SIZE = 5;
const METHOD_FILTER_ALL = "all";
const initialDeleteState: AccountingMutationActionState = {};

type SubscribedSemesterPaymentsSectionProps = {
  subscribedSemesterId: string;
  semesterName: string;
  payments: ManagerStudentPaymentRow[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  remainingDue: number;
  owedAmount: number;
  createLockReason: SubscriptionBillingGate["createLockReason"];
  editLockReason: SubscriptionBillingGate["editLockReason"];
  onPaymentSaved: () => void;
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

function matchesPaymentSearch(payment: ManagerStudentPaymentRow, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  return [
    String(payment.amount),
    payment.currency,
    formatPaymentMethodLabel(payment.method),
    format(new Date(payment.paid_at), "MMM d, yyyy"),
  ]
    .join(" ")
    .toLowerCase()
    .includes(normalizedQuery);
}

export function SubscribedSemesterPaymentsSection({
  subscribedSemesterId,
  semesterName,
  payments,
  canCreate,
  canEdit,
  canDelete,
  remainingDue,
  owedAmount,
  createLockReason,
  editLockReason,
  onPaymentSaved,
}: SubscribedSemesterPaymentsSectionProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [editingPayment, setEditingPayment] =
    useState<ManagerStudentPaymentRow | null>(null);
  const [viewingPayment, setViewingPayment] =
    useState<ManagerStudentPaymentRow | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<ManagerStudentPaymentRow | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState<string>(METHOD_FILTER_ALL);
  const [currentPage, setCurrentPage] = useState(1);
  const [isDeleteTransitionPending, startDeleteTransition] = useTransition();
  const [deleteState, deleteAction, isDeleteActionPending] = useActionState(
    deletePaymentAction,
    initialDeleteState
  );
  const isDeletePending = isDeleteActionPending || isDeleteTransitionPending;

  useActionStateToast(deleteState, isDeletePending);

  useActionStateSuccess(deleteState, isDeletePending, () => {
    setDeleteTarget(null);
    onPaymentSaved();
  });

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const matchesMethod =
        methodFilter === METHOD_FILTER_ALL || payment.method === methodFilter;

      return matchesMethod && matchesPaymentSearch(payment, searchQuery);
    });
  }, [methodFilter, payments, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedPayments = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredPayments.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredPayments, safeCurrentPage]);

  const pageNumbers = getPageNumbers(safeCurrentPage, totalPages);
  const rangeStart =
    filteredPayments.length === 0 ? 0 : (safeCurrentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safeCurrentPage * PAGE_SIZE, filteredPayments.length);

  const helperMessage = !canCreate
    ? getBillingMutationLockMessage(createLockReason, "create_payment")
    : !canEdit
      ? getBillingMutationLockMessage(editLockReason, "edit_payment")
      : null;

  function handleConfirmDelete() {
    if (!deleteTarget) {
      return;
    }

    const formData = new FormData();
    formData.set("id", deleteTarget.id);

    startDeleteTransition(() => {
      deleteAction(formData);
    });
  }

  return (
    <TooltipProvider>
      <AddPaymentDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        subscribedSemesterId={subscribedSemesterId}
        semesterName={semesterName}
        remainingDue={remainingDue}
        owedAmount={owedAmount}
        onPaymentSaved={onPaymentSaved}
      />

      <EditPaymentDialog
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) {
            setEditingPayment(null);
          }
        }}
        payment={editingPayment}
        remainingDue={remainingDue}
        onPaymentSaved={onPaymentSaved}
      />

      <PaymentDetailsDialog
        open={isDetailsOpen}
        onOpenChange={(open) => {
          setIsDetailsOpen(open);
          if (!open) {
            setViewingPayment(null);
          }
        }}
        payment={viewingPayment}
      />

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete payment</DialogTitle>
            <DialogDescription>
              This will permanently remove the{" "}
              {deleteTarget
                ? formatAccountCurrency(deleteTarget.amount, deleteTarget.currency)
                : "payment"}{" "}
              record. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeletePending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeletePending}
            >
              {isDeletePending ? <InlineSpinner /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="py-0">
        <CardHeader className="border-b bg-muted/40 py-3">
          <CardTitle>Payments</CardTitle>
          <CardAction className="self-center">
            <Button
              type="button"
              disabled={!canCreate}
              onClick={() => setIsAddOpen(true)}
            >
              <PlusIcon data-icon="inline-start" />
              Add payment
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {helperMessage ? (
            <div className="border-b px-4 pt-2 pb-3">
              <p className="text-sm text-muted-foreground">{helperMessage}</p>
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
                placeholder="Search amount, method, or date…"
                className="pl-8"
                aria-label="Search payments"
              />
            </div>
            <Select
              value={methodFilter}
              onValueChange={(value) => {
                setMethodFilter(value ?? METHOD_FILTER_ALL);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger
                className="w-full sm:w-44"
                aria-label="Filter by payment method"
              >
                <SelectValue placeholder="All methods" />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value={METHOD_FILTER_ALL}>All methods</SelectItem>
                {PAYMENT_METHOD_VALUES.map((method) => (
                  <SelectItem key={method} value={method}>
                    {PAYMENT_METHOD_LABELS[method as PaymentMethodValue]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Currency</th>
                  <th className="px-4 py-3 font-medium">Method</th>
                  <th className="px-4 py-3 font-medium">Paid at</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPayments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-muted-foreground"
                    >
                      {payments.length === 0
                        ? "No payments recorded for this subscription yet."
                        : "No payments match your filters."}
                    </td>
                  </tr>
                ) : (
                  paginatedPayments.map((payment) => (
                    <tr
                      key={payment.id}
                      className="border-b last:border-b-0 hover:bg-muted/20"
                    >
                      <td className="px-4 py-3 tabular-nums">
                        {formatAccountCurrency(payment.amount, payment.currency)}
                      </td>
                      <td className="max-w-[6rem] px-4 py-3 text-muted-foreground">
                        <TruncatedCell
                          value={payment.currency}
                          maxLength={MANAGER_PAYMENT_TABLE_LIMITS.currency}
                        />
                      </td>
                      <td className="max-w-[10rem] px-4 py-3 text-muted-foreground">
                        <TruncatedCell
                          value={formatPaymentMethodLabel(payment.method)}
                          maxLength={MANAGER_PAYMENT_TABLE_LIMITS.method}
                        />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {format(new Date(payment.paid_at), "MMM d, yyyy 'at' h:mm a")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`View payment details for ${formatAccountCurrency(payment.amount, payment.currency)}`}
                            onClick={() => {
                              setViewingPayment(payment);
                              setIsDetailsOpen(true);
                            }}
                          >
                            <MessageSquareTextIcon />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            disabled={!canEdit}
                            aria-label={`Edit payment of ${formatAccountCurrency(payment.amount, payment.currency)}`}
                            onClick={() => {
                              setEditingPayment(payment);
                              setIsEditOpen(true);
                            }}
                          >
                            <PencilIcon />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            disabled={!canDelete}
                            aria-label={`Delete payment of ${formatAccountCurrency(payment.amount, payment.currency)}`}
                            onClick={() => setDeleteTarget(payment)}
                          >
                            <Trash2Icon />
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
              Showing {rangeStart}–{rangeEnd} of {filteredPayments.length}
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
