"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { format } from "date-fns";
import { PencilIcon, BanIcon } from "lucide-react";
import { cancelPaymentPhaseAction } from "@/app/manager/accounting/actions";
import { Can } from "@/components/auth/can";
import { EditPaymentPhaseDialog } from "@/components/manager/accounting/edit-payment-phase-dialog";
import { PaymentPhaseStatusBadge } from "@/components/manager/accounting/payment-phase-status-badge";
import { SppStatusBadge } from "@/components/manager/accounting/spp-status-badge";
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
  getManagerAccountingSppDetailRoute,
  getManagerClassDetailRoute,
  ROUTES,
} from "@/lib/constants/routes";
import { PAYMENT_PHASE_STATUSES } from "@/lib/manager/accounting/constants";
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

const initialCancelState: CancelPaymentPhaseActionState = {};

type PaymentPhaseDetailsPanelProps = {
  phase: ManagerPaymentPhaseRow;
  initialSpps: ManagerSppRow[];
};

function DetailField({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm text-foreground">{children ?? value ?? "—"}</dd>
    </div>
  );
}

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

export function PaymentPhaseDetailsPanel({
  phase: initialPhase,
  initialSpps,
}: PaymentPhaseDetailsPanelProps) {
  const router = useRouter();
  const [phase, setPhase] = useState(initialPhase);
  const [prevPhase, setPrevPhase] = useState(initialPhase);
  const [spps, setSpps] = useState(initialSpps);
  const [prevSpps, setPrevSpps] = useState(initialSpps);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
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
    router.refresh();
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

  const handlePhaseUpdated = (updated: ManagerPaymentPhaseRow) => {
    setPhase(updated);
    router.refresh();
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
              <DetailField label="Class">
                <Link
                  href={getManagerClassDetailRoute(phase.class_id)}
                  className="font-medium text-primary hover:underline"
                >
                  {phase.class_name}
                </Link>
              </DetailField>
              <DetailField label="Semester code" value={phase.semester_code} />
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
              <DetailField
                label="SPP paid / active"
                value={`${phase.spp_paid_count}/${phase.spp_active_count}`}
              />
            </dl>
          </CardContent>
        </Card>

        <Card className="py-0">
          <CardHeader className="border-b py-3">
            <CardTitle>Student payment phases</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-sm">
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
                  </tr>
                </thead>
                <tbody>
                  {spps.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-10 text-center text-muted-foreground"
                      >
                        No student payment phases assigned yet.
                      </td>
                    </tr>
                  ) : (
                    spps.map((spp) => (
                      <tr
                        key={spp.id}
                        className="border-b last:border-b-0 hover:bg-muted/30"
                      >
                        <td className="max-w-[14rem] px-4 py-3 font-medium">
                          <Link
                            href={getManagerAccountingSppDetailRoute(
                              phase.id,
                              spp.id
                            )}
                            className="text-primary hover:underline"
                          >
                            <TruncatedCell
                              value={spp.student_label}
                              maxLength={32}
                            />
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <SppStatusBadge status={spp.status} />
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
