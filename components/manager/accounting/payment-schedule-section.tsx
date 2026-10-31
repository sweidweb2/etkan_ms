"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { deleteStudentPaymentScheduleAction } from "@/app/manager/accounting/actions";
import { Can } from "@/components/auth/can";
import { CreatePaymentScheduleDialog } from "@/components/manager/accounting/create-payment-schedule-dialog";
import { EditPaymentScheduleDialog } from "@/components/manager/accounting/edit-payment-schedule-dialog";
import { PaymentScheduleStatusBadge } from "@/components/manager/accounting/payment-schedule-status-badge";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatPaymentPhaseMoney } from "@/lib/constants/manager-payment-phase-display";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import type {
  DeleteStudentPaymentScheduleActionState,
  ManagerStudentPaymentScheduleRow,
} from "@/types/manager-student-payment-schedule";
import { CalendarIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { format } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const initialDeleteState: DeleteStudentPaymentScheduleActionState = {};

type PaymentScheduleSectionProps = {
  sppId: string;
  paymentPhaseId: string;
  remainingAmount: number;
  totalPaid: number;
  isScheduleEditable: boolean;
  initialSchedules: ManagerStudentPaymentScheduleRow[];
};

function sortSchedules(rows: ManagerStudentPaymentScheduleRow[]) {
  const byId = new Map<string, ManagerStudentPaymentScheduleRow>();
  for (const row of rows) {
    byId.set(row.id, row);
  }

  return [...byId.values()].sort((left, right) => {
    if (left.due_date !== right.due_date) {
      return left.due_date.localeCompare(right.due_date);
    }
    return left.created_at.localeCompare(right.created_at);
  });
}

function upsertSchedule(
  current: ManagerStudentPaymentScheduleRow[],
  schedule: ManagerStudentPaymentScheduleRow
) {
  return sortSchedules([
    ...current.filter((row) => row.id !== schedule.id),
    schedule,
  ]);
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

export function PaymentScheduleSection({
  sppId,
  paymentPhaseId,
  remainingAmount,
  totalPaid,
  isScheduleEditable,
  initialSchedules,
}: PaymentScheduleSectionProps) {
  const [schedules, setSchedules] = useState(initialSchedules);
  const [prevSchedules, setPrevSchedules] = useState(initialSchedules);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] =
    useState<ManagerStudentPaymentScheduleRow | null>(null);
  const [deletingSchedule, setDeletingSchedule] =
    useState<ManagerStudentPaymentScheduleRow | null>(null);
  const [isDeleteTransitionPending, startDeleteTransition] = useTransition();
  const [deleteState, deleteFormAction, isDeleteActionPending] = useActionState(
    deleteStudentPaymentScheduleAction,
    initialDeleteState
  );
  const isDeletePending = isDeleteActionPending || isDeleteTransitionPending;
  const handleDeleteOpenChange = usePendingAwareOpenChange(
    isDeletePending,
    (open) => {
      if (!open) {
        setDeletingSchedule(null);
      }
    }
  );

  useActionStateToast(deleteState, isDeletePending);

  if (initialSchedules !== prevSchedules) {
    setPrevSchedules(initialSchedules);
    setSchedules(initialSchedules);
  }

  const scheduleTarget = useMemo(
    () => Math.max(0, remainingAmount),
    [remainingAmount]
  );
  const scheduledTotal = useMemo(
    () => schedules.reduce((sum, row) => sum + row.amount, 0),
    [schedules]
  );
  const scheduleDiff = scheduledTotal - scheduleTarget;
  const hasScheduleMismatch = Math.abs(scheduleDiff) >= 0.01;

  useActionStateSuccess(deleteState, isDeletePending, () => {
    const removedId = deletingSchedule?.id;
    setDeletingSchedule(null);
    if (removedId) {
      setSchedules((current) =>
        sortSchedules(current.filter((row) => row.id !== removedId))
      );
    }
  });

  function handleScheduleCreated(schedule: ManagerStudentPaymentScheduleRow) {
    setSchedules((current) => upsertSchedule(current, schedule));
  }

  function handleScheduleUpdated(schedule: ManagerStudentPaymentScheduleRow) {
    setSchedules((current) => upsertSchedule(current, schedule));
  }

  function handleConfirmDeleteSchedule() {
    if (!deletingSchedule) return;

    const formData = new FormData();
    formData.set("id", deletingSchedule.id);
    formData.set("student_payment_phase_id", deletingSchedule.student_payment_phase_id);
    formData.set("payment_phase_id", paymentPhaseId);

    startDeleteTransition(() => {
      deleteFormAction(formData);
    });
  }

  return (
    <>
      <CreatePaymentScheduleDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        sppId={sppId}
        paymentPhaseId={paymentPhaseId}
        onCreated={handleScheduleCreated}
      />

      <EditPaymentScheduleDialog
        open={editingSchedule !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingSchedule(null);
          }
        }}
        schedule={editingSchedule}
        paymentPhaseId={paymentPhaseId}
        onUpdated={handleScheduleUpdated}
      />

      <Dialog
        open={deletingSchedule !== null}
        onOpenChange={handleDeleteOpenChange}
      >
        <DialogContent
          className="sm:max-w-md"
          showCloseButton={!isDeletePending}
        >
          <DialogHeader>
            <DialogTitle>Delete schedule row</DialogTitle>
            <DialogDescription>
              Delete{" "}
              {deletingSchedule ? (
                <>
                  <span className="font-medium">{deletingSchedule.label}</span>{" "}
                  ({formatPaymentPhaseMoney(deletingSchedule.amount)})?
                </>
              ) : (
                "this schedule row?"
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDeleteOpenChange(false)}
              disabled={isDeletePending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDeleteSchedule}
              disabled={isDeletePending}
            >
              {isDeletePending ? <InlineSpinner /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="py-0">
        <CardHeader className="border-b py-3">
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle>Payment schedule</CardTitle>
                <p
                  className={cn(
                    "text-sm",
                    hasScheduleMismatch
                      ? "text-amber-700 dark:text-amber-300"
                      : "text-muted-foreground"
                  )}
                >
                  Scheduled {formatPaymentPhaseMoney(scheduledTotal)} of{" "}
                  {formatPaymentPhaseMoney(scheduleTarget)} remaining
                  {totalPaid > 0 ? (
                    <>
                      {" "}
                      ({formatPaymentPhaseMoney(totalPaid)} already paid)
                    </>
                  ) : null}
                  {hasScheduleMismatch ? (
                    <>
                      {" "}
                      (diff {formatPaymentPhaseMoney(Math.abs(scheduleDiff))}
                      {scheduleDiff > 0 ? " over" : " under"})
                    </>
                  ) : null}
                </p>
              </div>
              {isScheduleEditable ? (
                <CardAction>
                  <Can permission={PERMISSIONS.PAYMENT_SCHEDULES_CREATE}>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setIsCreateOpen(true)}
                    >
                      <PlusIcon data-icon="inline-start" />
                      Add row
                    </Button>
                  </Can>
                </CardAction>
              ) : null}
            </div>
            {!isScheduleEditable ? (
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Phase closed or assignment cancelled — schedule is read-only.
              </p>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {schedules.length === 0 ? (
            <div className="px-4 py-4">
              <EmptyState
                size="sm"
                icon={CalendarIcon}
                title="No schedule rows yet"
                description="Add payment schedule rows for this assignment."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
                    <th className="px-4 py-3 font-medium">Due date</th>
                    <th className="px-4 py-3 font-medium">Label</th>
                    <th className="px-4 py-3 font-medium text-right">Amount</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Notes</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((schedule) => (
                    <tr
                      key={schedule.id}
                      className="border-b last:border-b-0 hover:bg-muted/30"
                    >
                      <td className="whitespace-nowrap px-4 py-3">
                        {format(new Date(schedule.due_date), "MMM d, yyyy")}
                      </td>
                      <td className="max-w-[12rem] px-4 py-3">
                        <TruncatedCell value={schedule.label} maxLength={28} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                        {formatPaymentPhaseMoney(schedule.amount)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <PaymentScheduleStatusBadge
                          status={schedule.status}
                          isOverdue={schedule.is_overdue}
                        />
                      </td>
                      <td className="max-w-[12rem] px-4 py-3 text-muted-foreground">
                        <TruncatedCell
                          value={schedule.notes ?? "—"}
                          maxLength={28}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {isScheduleEditable ? (
                            <>
                              <Can permission={PERMISSIONS.PAYMENT_SCHEDULES_UPDATE}>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label="Edit schedule row"
                                  onClick={() => setEditingSchedule(schedule)}
                                >
                                  <PencilIcon />
                                </Button>
                              </Can>
                              <Can permission={PERMISSIONS.PAYMENT_SCHEDULES_DELETE}>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label="Delete schedule row"
                                  onClick={() => setDeletingSchedule(schedule)}
                                >
                                  <Trash2Icon />
                                </Button>
                              </Can>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
