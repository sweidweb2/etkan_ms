"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CreditCardIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import {
  deleteWorkshopPaymentAction,
  loadWorkshopPaymentsAction,
} from "@/app/manager/workshops/actions";
import { Can } from "@/components/auth/can";
import { ClassTabCollapsibleSection } from "@/components/manager/students/class-tab-collapsible-section";
import { AddWorkshopPaymentDialog } from "@/components/manager/workshops/add-workshop-payment-dialog";
import { EditWorkshopPaymentDialog } from "@/components/manager/workshops/edit-workshop-payment-dialog";
import { UserStatCard } from "@/components/manager/users/user-stat-card";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import { ConfirmDestructiveDialog } from "@/components/ui/confirm-destructive-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import {
  WORKSHOP_PAYMENT_METHOD_LABELS,
  WORKSHOP_PAYMENT_TYPE_LABELS,
  WORKSHOP_PAYMENT_TYPES,
  type WorkshopPaymentMethod,
} from "@/lib/constants/manager-workshop-display";
import { formatPaymentPhaseMoney } from "@/lib/constants/manager-payment-phase-display";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { cn } from "@/lib/utils";
import { isWorkshopFullyPaid } from "@/lib/validators/manager/workshop-payment";
import { useMutationDialogForm } from "@/hooks/use-mutation-dialog-form";
import type {
  DeleteWorkshopPaymentActionState,
  ManagerWorkshopPaymentRow,
  ManagerWorkshopPaymentSummary,
} from "@/types/manager-workshop";

const initialDeleteState: DeleteWorkshopPaymentActionState = {};

type WorkshopPaymentsSectionProps = {
  workshopId: string;
  workshopPrice: number | null;
  mutationsLocked?: boolean;
};

function emptyPaymentSummary(
  price: number | null
): ManagerWorkshopPaymentSummary {
  return {
    credits: 0,
    debits: 0,
    net: 0,
    price,
    remaining: price,
  };
}

function formatMethod(method: ManagerWorkshopPaymentRow["payment_method"]) {
  if (!method) {
    return "—";
  }
  if (method in WORKSHOP_PAYMENT_METHOD_LABELS) {
    return WORKSHOP_PAYMENT_METHOD_LABELS[method as WorkshopPaymentMethod];
  }
  return method;
}

export function WorkshopPaymentsSection({
  workshopId,
  workshopPrice,
  mutationsLocked = false,
}: WorkshopPaymentsSectionProps) {
  const [payments, setPayments] = useState<ManagerWorkshopPaymentRow[]>([]);
  const [summary, setSummary] = useState<ManagerWorkshopPaymentSummary>(() =>
    emptyPaymentSummary(workshopPrice)
  );
  const [isLoading, setIsLoading] = useState(true);
  const [prevWorkshopId, setPrevWorkshopId] = useState(workshopId);
  const [isAddOpen, setIsAddOpen] = useState(false);

  if (workshopId !== prevWorkshopId) {
    setPrevWorkshopId(workshopId);
    setIsLoading(true);
  }
  const [editingPayment, setEditingPayment] =
    useState<ManagerWorkshopPaymentRow | null>(null);
  const [deletingPayment, setDeletingPayment] =
    useState<ManagerWorkshopPaymentRow | null>(null);

  const { formAction, isPending, handleOpenChange } = useMutationDialogForm({
    action: deleteWorkshopPaymentAction,
    initialState: initialDeleteState,
    open: Boolean(deletingPayment),
    onOpenChange: (open) => {
      if (!open) {
        setDeletingPayment(null);
      }
    },
    onSuccess: () => {
      if (deletingPayment) {
        const removedId = deletingPayment.id;
        setPayments((rows) =>
          rows.filter((payment) => payment.id !== removedId)
        );
        void loadWorkshopPaymentsAction(workshopId).then((result) => {
          if (result) {
            setSummary(result.summary);
          }
        });
      }
      setDeletingPayment(null);
    },
  });

  useEffect(() => {
    let cancelled = false;
    void loadWorkshopPaymentsAction(workshopId).then((result) => {
      if (cancelled) {
        return;
      }
      if (result) {
        setPayments(result.payments);
        setSummary(result.summary);
      }
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [workshopId]);

  async function syncPaymentsFromServer() {
    const result = await loadWorkshopPaymentsAction(workshopId);
    if (result) {
      setPayments(result.payments);
      setSummary(result.summary);
    }
  }

  function handlePaymentCreated(payment: ManagerWorkshopPaymentRow) {
    setPayments((current) =>
      current.some((row) => row.id === payment.id)
        ? current.map((row) => (row.id === payment.id ? payment : row))
        : [...current, payment]
    );
    void syncPaymentsFromServer();
  }

  function handlePaymentUpdated(payment: ManagerWorkshopPaymentRow) {
    setPayments((current) =>
      current.map((row) => (row.id === payment.id ? payment : row))
    );
    void syncPaymentsFromServer();
  }

  const fullyPaid = isWorkshopFullyPaid(workshopPrice, summary.net);
  const canAddPayment = !mutationsLocked && !fullyPaid;

  return (
    <>
      <AddWorkshopPaymentDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        workshopId={workshopId}
        defaultAmount={
          summary.remaining != null
            ? Math.max(0, summary.remaining)
            : workshopPrice
        }
        maxAmount={
          summary.remaining != null ? Math.max(0, summary.remaining) : null
        }
        onCreated={handlePaymentCreated}
      />

      <EditWorkshopPaymentDialog
        open={Boolean(editingPayment)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingPayment(null);
          }
        }}
        payment={editingPayment}
        maxAmount={
          summary.remaining == null
            ? null
            : Math.max(
                0,
                summary.remaining +
                  (editingPayment?.type === WORKSHOP_PAYMENT_TYPES.CREDIT
                    ? editingPayment.amount
                    : 0)
              )
        }
        onUpdated={handlePaymentUpdated}
      />

      <ConfirmDestructiveDialog
        open={Boolean(deletingPayment)}
        onOpenChange={handleOpenChange}
        isPending={isPending}
        canConfirm={Boolean(deletingPayment)}
        title="Delete payment"
        description={
          <>
            Permanently delete this{" "}
            {deletingPayment
              ? WORKSHOP_PAYMENT_TYPE_LABELS[deletingPayment.type].toLowerCase()
              : "payment"}{" "}
            of{" "}
            {deletingPayment
              ? formatPaymentPhaseMoney(deletingPayment.amount)
              : "—"}
            ? This cannot be undone.
          </>
        }
        formAction={formAction}
      >
        {deletingPayment ? (
          <>
            <input type="hidden" name="id" value={deletingPayment.id} />
            <input type="hidden" name="workshop_id" value={workshopId} />
          </>
        ) : null}
      </ConfirmDestructiveDialog>

      <ClassTabCollapsibleSection
        title="Payments"
        description={
          isLoading
            ? "Loading payments…"
            : payments.length === 0
              ? "No payments yet"
              : `${payments.length} payment${payments.length === 1 ? "" : "s"}`
        }
        storageKey={`workshop-details-payments-v2:${workshopId}`}
        defaultOpen
        action={
          canAddPayment ? (
            <Can permission={PERMISSIONS.WORKSHOPS_PAYMENTS_CREATE}>
              <Button type="button" size="sm" onClick={() => setIsAddOpen(true)}>
                <PlusIcon data-icon="inline-start" />
                Add payment
              </Button>
            </Can>
          ) : undefined
        }
      >
        <div className="flex flex-col gap-4 px-3 py-4 sm:px-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <UserStatCard
              label="Credits"
              value={formatPaymentPhaseMoney(summary.credits)}
              accentClassName="border-l-emerald-500"
            />
            <UserStatCard
              label="Debits"
              value={formatPaymentPhaseMoney(summary.debits)}
              accentClassName="border-l-rose-500"
            />
            <UserStatCard
              label="Net (credits − debits)"
              value={formatPaymentPhaseMoney(summary.net)}
              accentClassName="border-l-sky-500"
            />
            <UserStatCard
              label={
                summary.price == null ? "Workshop price" : "Remaining vs price"
              }
              value={
                summary.price == null
                  ? "—"
                  : formatPaymentPhaseMoney(summary.remaining ?? 0)
              }
              accentClassName="border-l-amber-500"
            />
          </div>

          {isLoading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <InlineSpinner />
              Loading payments…
            </p>
          ) : payments.length === 0 ? (
            <EmptyState
              size="sm"
              icon={CreditCardIcon}
              title="No payments recorded yet"
              description="Add a payment to track credits and debits for this workshop."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-3 font-medium">Date</th>
                    <th className="pb-2 pr-3 font-medium">Type</th>
                    <th className="pb-2 pr-3 font-medium">Amount</th>
                    <th className="pb-2 pr-3 font-medium">Method</th>
                    <th className="pb-2 pr-3 font-medium">Notes</th>
                    <th className="pb-2 font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => {
                    const isCredit =
                      payment.type === WORKSHOP_PAYMENT_TYPES.CREDIT;
                    return (
                      <tr
                        key={payment.id}
                        className="border-b border-border/60 last:border-0"
                      >
                        <td className="py-3 pr-3 align-top text-foreground">
                          {format(
                            new Date(payment.payment_date),
                            "MMM d, yyyy"
                          )}
                        </td>
                        <td className="py-3 pr-3 align-top text-foreground">
                          {WORKSHOP_PAYMENT_TYPE_LABELS[payment.type]}
                        </td>
                        <td
                          className={cn(
                            "py-3 pr-3 align-top font-medium",
                            isCredit
                              ? "text-emerald-700 dark:text-emerald-400"
                              : "text-rose-700 dark:text-rose-400"
                          )}
                        >
                          {isCredit ? "+" : "−"}
                          {formatPaymentPhaseMoney(payment.amount)}
                        </td>
                        <td className="py-3 pr-3 align-top text-muted-foreground">
                          {formatMethod(payment.payment_method)}
                        </td>
                        <td className="py-3 pr-3 align-top text-muted-foreground">
                          {payment.notes?.trim() ? payment.notes : "—"}
                        </td>
                        <td className="py-3 align-top">
                          {!mutationsLocked ? (
                            <div className="flex items-center justify-end gap-1">
                              <Can
                                permission={PERMISSIONS.WORKSHOPS_PAYMENTS_UPDATE}
                              >
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  aria-label="Edit payment"
                                  onClick={() => setEditingPayment(payment)}
                                >
                                  <PencilIcon />
                                </Button>
                              </Can>
                              <Can
                                permission={PERMISSIONS.WORKSHOPS_PAYMENTS_DELETE}
                              >
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  aria-label="Delete payment"
                                  onClick={() => setDeletingPayment(payment)}
                                >
                                  <Trash2Icon />
                                </Button>
                              </Can>
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </ClassTabCollapsibleSection>
    </>
  );
}
