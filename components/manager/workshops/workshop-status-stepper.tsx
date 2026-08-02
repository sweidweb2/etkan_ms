"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { changeWorkshopStatusAction } from "@/app/manager/workshops/actions";
import { Can } from "@/components/auth/can";
import { WorkshopStatusBadge } from "@/components/manager/workshops/workshop-status-badge";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MANAGER_WORKSHOP_STATUS_LABELS,
} from "@/lib/constants/manager-workshop-display";
import {
  WORKSHOP_STATUSES,
  WORKSHOP_STATUS_FLOW,
  type WorkshopStatusValue,
} from "@/lib/constants/manager-workshop-status";
import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  assertWorkshopStatusTransition,
  canCancelWorkshopStatus,
  canReopenWorkshopFromCancelled,
  formatLocalDateYmd,
  getNextWorkshopStatus,
  getPreviousWorkshopStatus,
} from "@/lib/manager/workshops/status-transitions";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { cn } from "@/lib/utils";
import type {
  ChangeWorkshopStatusActionState,
  ManagerWorkshopRow,
} from "@/types/manager-workshop";

type ConfirmKind = "next" | "back" | "cancel" | "reopen";

type WorkshopStatusStepperProps = {
  workshop: ManagerWorkshopRow;
  onStatusChanged: (workshop: ManagerWorkshopRow) => void;
};

const initialState: ChangeWorkshopStatusActionState = {};

function stepTone(
  status: WorkshopStatusValue,
  current: WorkshopStatusValue
): "done" | "current" | "upcoming" | "cancelled" {
  if (current === WORKSHOP_STATUSES.CANCELLED) {
    return "cancelled";
  }
  const flow = WORKSHOP_STATUS_FLOW;
  const currentIndex = flow.indexOf(
    current as (typeof WORKSHOP_STATUS_FLOW)[number]
  );
  const stepIndex = flow.indexOf(
    status as (typeof WORKSHOP_STATUS_FLOW)[number]
  );
  if (stepIndex < 0 || currentIndex < 0) {
    return "upcoming";
  }
  if (stepIndex < currentIndex) {
    return "done";
  }
  if (stepIndex === currentIndex) {
    return "current";
  }
  return "upcoming";
}

export function WorkshopStatusStepper({
  workshop,
  onStatusChanged,
}: WorkshopStatusStepperProps) {
  const [confirmKind, setConfirmKind] = useState<ConfirmKind | null>(null);
  const [pendingTarget, setPendingTarget] =
    useState<WorkshopStatusValue | null>(null);
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    changeWorkshopStatusAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;

  const handleConfirmOpenChange = usePendingAwareOpenChange(
    isPending,
    (open) => {
      if (!open) {
        setConfirmKind(null);
        setPendingTarget(null);
      }
    }
  );

  useActionStateToast(state, isPending);
  useActionStateSuccess(state, isPending, (next) => {
    if (next.workshop) {
      onStatusChanged(next.workshop);
    }
    setConfirmKind(null);
    setPendingTarget(null);
  });

  const nextStatus = getNextWorkshopStatus(workshop.status);
  const previousStatus = getPreviousWorkshopStatus(workshop.status);
  const canCancel = canCancelWorkshopStatus(workshop.status);
  const canReopen = canReopenWorkshopFromCancelled(workshop.status);

  const scheduledGuard = useMemo(() => {
    if (nextStatus !== WORKSHOP_STATUSES.SCHEDULED) {
      return { ok: true as const };
    }
    return assertWorkshopStatusTransition({
      from: workshop.status,
      to: WORKSHOP_STATUSES.SCHEDULED,
      startDate: workshop.start_date,
      endDate: workshop.end_date,
      today: formatLocalDateYmd(),
    });
  }, [
    nextStatus,
    workshop.end_date,
    workshop.start_date,
    workshop.status,
  ]);

  const nextDisabled = !nextStatus || !scheduledGuard.ok;

  function openConfirm(kind: ConfirmKind, target: WorkshopStatusValue) {
    setConfirmKind(kind);
    setPendingTarget(target);
  }

  function submitStatusChange() {
    if (!pendingTarget) {
      return;
    }
    const formData = new FormData();
    formData.set("id", workshop.id);
    formData.set("status", pendingTarget);
    startTransition(() => {
      formAction(formData);
    });
  }

  const confirmTitle =
    confirmKind === "cancel"
      ? "Cancel workshop"
      : confirmKind === "reopen"
        ? "Reopen workshop"
        : confirmKind === "back"
          ? "Move status backward"
          : "Advance status";

  const confirmDescription =
    pendingTarget && confirmKind
      ? `Change status from ${MANAGER_WORKSHOP_STATUS_LABELS[workshop.status]} to ${MANAGER_WORKSHOP_STATUS_LABELS[pendingTarget]}?`
      : "";

  return (
    <div className="rounded-xl border bg-card px-4 py-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">
            Workshop status
          </h2>
          <p className="text-xs text-muted-foreground">
            Advance or step back one checkpoint at a time.
          </p>
        </div>
        <WorkshopStatusBadge status={workshop.status} />
      </div>

      {workshop.status === WORKSHOP_STATUSES.CANCELLED ? (
        <p className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-800 dark:text-rose-200">
          This workshop is cancelled. Reopen as draft to continue the lifecycle.
        </p>
      ) : null}

      <div className="relative mb-6 px-1 pt-2">
        <div className="absolute top-4 right-2 left-2 h-1 rounded-full bg-muted" />
        <div className="relative grid grid-cols-5 gap-1">
          {WORKSHOP_STATUS_FLOW.map((status) => {
            const tone = stepTone(status, workshop.status);
            return (
              <div
                key={status}
                className="flex flex-col items-center gap-2 text-center"
              >
                <div
                  className={cn(
                    "relative z-10 size-3.5 rounded-full border-[3px] bg-card shadow-sm",
                    tone === "done" && "border-emerald-500 bg-emerald-500",
                    tone === "current" && "border-sky-500 bg-sky-500",
                    tone === "upcoming" && "border-muted-foreground/30",
                    tone === "cancelled" && "border-rose-400/60"
                  )}
                  aria-hidden
                />
                <span
                  className={cn(
                    "text-[11px] font-medium",
                    tone === "current"
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {MANAGER_WORKSHOP_STATUS_LABELS[status]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {!scheduledGuard.ok && nextStatus === WORKSHOP_STATUSES.SCHEDULED ? (
        <p className="mb-3 text-sm text-amber-700 dark:text-amber-300">
          {scheduledGuard.error}
        </p>
      ) : null}

      <Can permission={PERMISSIONS.WORKSHOPS_UPDATE}>
        <div className="flex flex-wrap gap-2">
          {canReopen ? (
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() =>
                openConfirm("reopen", WORKSHOP_STATUSES.DRAFT)
              }
            >
              Reopen as draft
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={!previousStatus || isPending}
                onClick={() => {
                  if (previousStatus) {
                    openConfirm("back", previousStatus);
                  }
                }}
              >
                Back
              </Button>
              <Button
                type="button"
                disabled={nextDisabled || isPending}
                onClick={() => {
                  if (nextStatus) {
                    openConfirm("next", nextStatus);
                  }
                }}
              >
                Next
              </Button>
              {canCancel ? (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={isPending}
                  onClick={() =>
                    openConfirm("cancel", WORKSHOP_STATUSES.CANCELLED)
                  }
                >
                  Cancel workshop
                </Button>
              ) : null}
            </>
          )}
        </div>
      </Can>

      <Dialog
        open={confirmKind !== null}
        onOpenChange={handleConfirmOpenChange}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
          <DialogHeader>
            <DialogTitle>{confirmTitle}</DialogTitle>
            <DialogDescription>{confirmDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => handleConfirmOpenChange(false)}
            >
              Keep current
            </Button>
            <Button
              type="button"
              variant={confirmKind === "cancel" ? "destructive" : "default"}
              disabled={isPending || !pendingTarget}
              onClick={submitStatusChange}
            >
              {isPending ? (
                <>
                  <InlineSpinner className="mr-2" />
                  Updating…
                </>
              ) : (
                "Confirm"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
