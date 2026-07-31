"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { format } from "date-fns";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { deleteStudentPaymentAction } from "@/app/manager/accounting/actions";
import { Can } from "@/components/auth/can";
import { CreateStudentPaymentDialog } from "@/components/manager/accounting/create-student-payment-dialog";
import { EditStudentPaymentDialog } from "@/components/manager/accounting/edit-student-payment-dialog";
import { PaymentPhaseStatusBadge } from "@/components/manager/accounting/payment-phase-status-badge";
import { SppStatusBadge } from "@/components/manager/accounting/spp-status-badge";
import { UserStatCard } from "@/components/manager/users/user-stat-card";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatPaymentPhaseMoney } from "@/lib/constants/manager-payment-phase-display";
import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  getManagerAccountingPhaseDetailRoute,
  ROUTES,
} from "@/lib/constants/routes";
import {
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
} from "@/lib/manager/accounting/constants";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import type {
  DeleteStudentPaymentActionState,
  ManagerSppDetail,
  ManagerStudentPaymentRow,
} from "@/types/manager-student-payment";

const initialDeleteState: DeleteStudentPaymentActionState = {};

type SppDetailsPanelProps = {
  spp: ManagerSppDetail;
  initialPayments: ManagerStudentPaymentRow[];
  actorLabel: string;
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

export function SppDetailsPanel({
  spp: initialSpp,
  initialPayments,
  actorLabel,
}: SppDetailsPanelProps) {
  const router = useRouter();
  const [spp, setSpp] = useState(initialSpp);
  const [prevSpp, setPrevSpp] = useState(initialSpp);
  const [payments, setPayments] = useState(initialPayments);
  const [prevPayments, setPrevPayments] = useState(initialPayments);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPayment, setEditingPayment] =
    useState<ManagerStudentPaymentRow | null>(null);
  const [deletingPayment, setDeletingPayment] =
    useState<ManagerStudentPaymentRow | null>(null);
  const [isTransitionPending, startTransition] = useTransition();
  const [deleteState, deleteAction, isDeletePending] = useActionState(
    deleteStudentPaymentAction,
    initialDeleteState
  );
  const isDeleteActionPending = isDeletePending || isTransitionPending;
  const handleDeleteOpenChange = usePendingAwareOpenChange(
    isDeleteActionPending,
    (open) => {
      if (!open) {
        setDeletingPayment(null);
      }
    }
  );

  useActionStateToast(deleteState, isDeleteActionPending);
  useActionStateSuccess(deleteState, isDeleteActionPending, () => {
    setDeletingPayment(null);
    router.refresh();
  });

  if (initialSpp !== prevSpp) {
    setPrevSpp(initialSpp);
    setSpp(initialSpp);
  }

  if (initialPayments !== prevPayments) {
    setPrevPayments(initialPayments);
    setPayments(initialPayments);
  }

  const handleChanged = () => {
    router.refresh();
  };

  function handleConfirmDelete() {
    if (!deletingPayment) return;
    const formData = new FormData();
    formData.set("id", deletingPayment.id);
    formData.set("student_payment_phase_id", spp.id);
    startTransition(() => {
      deleteAction(formData);
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
              <BreadcrumbLink
                href={getManagerAccountingPhaseDetailRoute(spp.payment_phase_id)}
              >
                {spp.payment_phase_name}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{spp.student_label}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <CreateStudentPaymentDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          sppId={spp.id}
          defaultReceivedBy={actorLabel}
          onCreated={handleChanged}
        />

        <EditStudentPaymentDialog
          open={editingPayment !== null}
          onOpenChange={(open) => {
            if (!open) setEditingPayment(null);
          }}
          payment={editingPayment}
          onUpdated={handleChanged}
        />

        <Dialog
          open={deletingPayment !== null}
          onOpenChange={handleDeleteOpenChange}
        >
          <DialogContent
            className="sm:max-w-md"
            showCloseButton={!isDeleteActionPending}
          >
            <DialogHeader>
              <DialogTitle>Delete payment</DialogTitle>
              <DialogDescription>
                Delete this payment of{" "}
                {deletingPayment
                  ? formatPaymentPhaseMoney(deletingPayment.amount)
                  : ""}
                ? Balances will recalculate.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDeleteOpenChange(false)}
                disabled={isDeleteActionPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={isDeleteActionPending}
              >
                {isDeleteActionPending ? <InlineSpinner /> : null}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <CardTitle>{spp.student_label}</CardTitle>
            <CardAction className="flex flex-wrap items-center gap-2">
              <SppStatusBadge status={spp.status} />
              <PaymentPhaseStatusBadge status={spp.payment_phase_status} />
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
            <p>
              Phase{" "}
              <Link
                href={getManagerAccountingPhaseDetailRoute(spp.payment_phase_id)}
                className="font-medium text-primary hover:underline"
              >
                {spp.payment_phase_name}
              </Link>
              {" · "}
              {spp.class_name}
            </p>
            {spp.payments_blocked ? (
              <p className="text-amber-700 dark:text-amber-300">
                Payments are blocked because this phase or student assignment is
                cancelled.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <UserStatCard
            label="Original"
            value={formatPaymentPhaseMoney(spp.original_amount)}
            accentClassName="border-l-sky-500"
          />
          <UserStatCard
            label="Adjustment"
            value={formatPaymentPhaseMoney(spp.adjustment_amount)}
            accentClassName="border-l-violet-500"
          />
          <UserStatCard
            label="Due"
            value={formatPaymentPhaseMoney(spp.final_amount_due)}
            accentClassName="border-l-amber-500"
          />
          <UserStatCard
            label="Paid"
            value={formatPaymentPhaseMoney(spp.total_paid)}
            accentClassName="border-l-emerald-500"
          />
          <div
            className={cn(
              "rounded-xl bg-card py-4 pl-4 pr-5 ring-1 ring-foreground/10 border-l-4 border-l-rose-500"
            )}
          >
            <p className="text-sm text-muted-foreground">Remaining</p>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight tabular-nums">
              {formatPaymentPhaseMoney(spp.remaining_amount)}
              {spp.has_credit ? (
                <span className="inline-flex items-center rounded-md bg-violet-500/15 px-2 py-0.5 text-xs font-medium text-violet-700 dark:text-violet-300">
                  Credit
                </span>
              ) : null}
            </p>
          </div>
        </div>

        <Card className="py-0">
          <CardHeader className="border-b py-3">
            <CardTitle>Payments</CardTitle>
            {!spp.payments_blocked ? (
              <CardAction>
                <Can permission={PERMISSIONS.ACCOUNTING_PAYMENTS_CREATE}>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setIsCreateOpen(true)}
                  >
                    <PlusIcon data-icon="inline-start" />
                    Record payment
                  </Button>
                </Can>
              </CardAction>
            ) : null}
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium text-right">Amount</th>
                    <th className="px-4 py-3 font-medium">Method</th>
                    <th className="px-4 py-3 font-medium">Received by</th>
                    <th className="px-4 py-3 font-medium">Management</th>
                    <th className="px-4 py-3 font-medium">Receipt</th>
                    <th className="px-4 py-3 font-medium">Notes</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-10 text-center text-muted-foreground"
                      >
                        No payments recorded yet.
                      </td>
                    </tr>
                  ) : (
                    payments.map((payment) => (
                      <tr
                        key={payment.id}
                        className="border-b last:border-b-0 hover:bg-muted/30"
                      >
                        <td className="whitespace-nowrap px-4 py-3">
                          {format(
                            new Date(payment.payment_date),
                            "MMM d, yyyy"
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                          {formatPaymentPhaseMoney(payment.amount)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {
                            PAYMENT_METHOD_LABELS[
                              payment.payment_method as PaymentMethod
                            ]
                          }
                        </td>
                        <td className="max-w-[10rem] px-4 py-3">
                          <TruncatedCell
                            value={payment.received_by}
                            maxLength={24}
                          />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {payment.received_by_management ? "Yes" : "No"}
                        </td>
                        <td className="max-w-[8rem] px-4 py-3 text-muted-foreground">
                          <TruncatedCell
                            value={payment.receipt_number ?? "—"}
                            maxLength={16}
                          />
                        </td>
                        <td className="max-w-[10rem] px-4 py-3 text-muted-foreground">
                          <TruncatedCell
                            value={payment.notes ?? "—"}
                            maxLength={24}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {!spp.payments_blocked ? (
                              <>
                                <Can
                                  permission={
                                    PERMISSIONS.ACCOUNTING_PAYMENTS_UPDATE
                                  }
                                >
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label="Edit payment"
                                    onClick={() => setEditingPayment(payment)}
                                  >
                                    <PencilIcon />
                                  </Button>
                                </Can>
                                <Can
                                  permission={
                                    PERMISSIONS.ACCOUNTING_PAYMENTS_DELETE
                                  }
                                >
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label="Delete payment"
                                    onClick={() => setDeletingPayment(payment)}
                                  >
                                    <Trash2Icon />
                                  </Button>
                                </Can>
                              </>
                            ) : null}
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
