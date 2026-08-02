"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { deleteWorkshopPaymentAction } from "@/app/manager/workshops/actions";
import { Can } from "@/components/auth/can";
import { AddWorkshopPaymentDialog } from "@/components/manager/workshops/add-workshop-payment-dialog";
import { EditWorkshopPaymentDialog } from "@/components/manager/workshops/edit-workshop-payment-dialog";
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
  WORKSHOP_PAYMENT_METHOD_LABELS,
  WORKSHOP_PAYMENT_TYPE_LABELS,
  WORKSHOP_PAYMENT_TYPES,
  type WorkshopPaymentMethod,
} from "@/lib/constants/manager-workshop-display";
import { formatPaymentPhaseMoney } from "@/lib/constants/manager-payment-phase-display";
import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  getManagerWorkshopDetailRoute,
  ROUTES,
} from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import type {
  DeleteWorkshopPaymentActionState,
  ManagerWorkshopPaymentRow,
  ManagerWorkshopPaymentSummary,
  ManagerWorkshopRow,
} from "@/types/manager-workshop";

const initialDeleteState: DeleteWorkshopPaymentActionState = {};

type WorkshopPaymentsPanelProps = {
  workshop: ManagerWorkshopRow;
  payments: ManagerWorkshopPaymentRow[];
  summary: ManagerWorkshopPaymentSummary;
};

function formatMethod(method: ManagerWorkshopPaymentRow["payment_method"]) {
  if (!method) {
    return "—";
  }
  if (method in WORKSHOP_PAYMENT_METHOD_LABELS) {
    return WORKSHOP_PAYMENT_METHOD_LABELS[method as WorkshopPaymentMethod];
  }
  return method;
}

export function WorkshopPaymentsPanel({
  workshop,
  payments,
  summary,
}: WorkshopPaymentsPanelProps) {
  const router = useRouter();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingPayment, setEditingPayment] =
    useState<ManagerWorkshopPaymentRow | null>(null);
  const [deletingPayment, setDeletingPayment] =
    useState<ManagerWorkshopPaymentRow | null>(null);
  const [isTransitionPending, startTransition] = useTransition();
  const [deleteState, deleteAction, isDeletePending] = useActionState(
    deleteWorkshopPaymentAction,
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

  function handleConfirmDelete() {
    if (!deletingPayment) {
      return;
    }
    const formData = new FormData();
    formData.set("id", deletingPayment.id);
    formData.set("workshop_id", workshop.id);
    startTransition(() => {
      deleteAction(formData);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={ROUTES.MANAGER_WORKSHOPS}>
              Manage workshops
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={getManagerWorkshopDetailRoute(workshop.id)}>
              {workshop.name}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Payments</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <AddWorkshopPaymentDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        workshopId={workshop.id}
        onCreated={() => router.refresh()}
      />

      <EditWorkshopPaymentDialog
        open={Boolean(editingPayment)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingPayment(null);
          }
        }}
        payment={editingPayment}
        onUpdated={() => router.refresh()}
      />

      <Dialog
        open={Boolean(deletingPayment)}
        onOpenChange={handleDeleteOpenChange}
      >
        <DialogContent
          className="sm:max-w-md"
          showCloseButton={!isDeleteActionPending}
        >
          <DialogHeader>
            <DialogTitle>Delete payment</DialogTitle>
            <DialogDescription>
              Permanently delete this{" "}
              {deletingPayment
                ? WORKSHOP_PAYMENT_TYPE_LABELS[deletingPayment.type].toLowerCase()
                : "payment"}{" "}
              of{" "}
              {deletingPayment
                ? formatPaymentPhaseMoney(deletingPayment.amount)
                : "—"}
              ? This cannot be undone.
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
          label={summary.price == null ? "Workshop price" : "Remaining vs price"}
          value={
            summary.price == null
              ? "—"
              : formatPaymentPhaseMoney(summary.remaining ?? 0)
          }
          accentClassName="border-l-amber-500"
        />
      </div>

      <Card className="gap-0 py-0">
        <CardHeader className="border-b bg-muted/50 py-3">
          <CardTitle className="text-lg">Ledger</CardTitle>
          <CardAction>
            <Can permission={PERMISSIONS.WORKSHOPS_UPDATE}>
              <Button type="button" onClick={() => setIsAddOpen(true)}>
                <PlusIcon data-icon="inline-start" />
                Add payment
              </Button>
            </Can>
          </CardAction>
        </CardHeader>
        <CardContent className="pt-4 pb-4">
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No payments recorded yet.
            </p>
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
                          <Can permission={PERMISSIONS.WORKSHOPS_UPDATE}>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label="Edit payment"
                                onClick={() => setEditingPayment(payment)}
                              >
                                <PencilIcon />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label="Delete payment"
                                onClick={() => setDeletingPayment(payment)}
                              >
                                <Trash2Icon />
                              </Button>
                            </div>
                          </Can>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
