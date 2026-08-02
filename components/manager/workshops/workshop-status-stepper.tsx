"use client";

import { useActionState, useState, useTransition } from "react";
import {
  CalendarDaysIcon,
  CheckIcon,
  CircleCheckIcon,
  FileBadgeIcon,
  FilePenLineIcon,
  TimerIcon,
} from "lucide-react";
import { changeWorkshopStatusAction } from "@/app/manager/workshops/actions";
import { Can } from "@/components/auth/can";
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
  canCancelWorkshopStatus,
  canReopenWorkshopFromCancelled,
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

type ConfirmKind = "jump" | "next" | "back" | "cancel" | "reopen";
type StepTone = "done" | "current" | "upcoming" | "cancelled";

type WorkshopStatusStepperProps = {
  workshop: ManagerWorkshopRow;
  onStatusChanged: (workshop: ManagerWorkshopRow) => void;
};

const initialState: ChangeWorkshopStatusActionState = {};

const STATUS_ICONS = {
  [WORKSHOP_STATUSES.DRAFT]: FilePenLineIcon,
  [WORKSHOP_STATUSES.PROPOSAL]: FileBadgeIcon,
  [WORKSHOP_STATUSES.SCHEDULED]: CalendarDaysIcon,
  [WORKSHOP_STATUSES.IN_PROGRESS]: TimerIcon,
  [WORKSHOP_STATUSES.COMPLETED]: CircleCheckIcon,
} as const;

function stepTone(
  status: WorkshopStatusValue,
  current: WorkshopStatusValue
): StepTone {
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

function WorkshopStatusCheckpoint({
  status,
  tone,
  clickable,
  disabled,
  onSelect,
}: {
  status: WorkshopStatusValue;
  tone: StepTone;
  clickable: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const Icon = STATUS_ICONS[status as keyof typeof STATUS_ICONS];
  const label = MANAGER_WORKSHOP_STATUS_LABELS[status];

  const marker = (
    <div
      className={cn(
        "flex size-10 items-center justify-center rounded-full border-2 bg-background shadow-sm transition-colors sm:size-11",
        tone === "done" &&
          "border-emerald-500 bg-emerald-500 text-white shadow-emerald-500/20",
        tone === "current" &&
          "border-sky-500 text-sky-600 ring-4 ring-sky-500/20 dark:text-sky-400",
        tone === "upcoming" &&
          "border-muted-foreground/25 text-muted-foreground/55",
        tone === "cancelled" && "border-rose-400/50 text-rose-400/70",
        clickable &&
          !disabled &&
          "group-hover:scale-105 group-hover:border-foreground/40 group-hover:text-foreground"
      )}
    >
      {Icon ? <Icon className="size-4 sm:size-5" strokeWidth={2.25} /> : null}
    </div>
  );

  return (
    <div className="relative z-10 flex flex-col items-center gap-2">
      {clickable ? (
        <button
          type="button"
          className="group relative rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-60"
          disabled={disabled}
          aria-label={`Set status to ${label}`}
          onClick={onSelect}
        >
          {marker}
          {tone === "done" ? (
            <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-emerald-600 text-white ring-2 ring-background">
              <CheckIcon className="size-2.5" strokeWidth={3} />
            </span>
          ) : null}
        </button>
      ) : (
        <div className="relative" aria-current="step">
          {marker}
          {tone === "done" ? (
            <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-emerald-600 text-white ring-2 ring-background">
              <CheckIcon className="size-2.5" strokeWidth={3} />
            </span>
          ) : null}
        </div>
      )}
      <span
        className={cn(
          "text-[11px] font-medium leading-tight",
          tone === "current" ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {label}
      </span>
    </div>
  );
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
          : confirmKind === "jump"
            ? "Change status"
            : "Advance status";

  const confirmDescription =
    pendingTarget && confirmKind
      ? `Change status from ${MANAGER_WORKSHOP_STATUS_LABELS[workshop.status]} to ${MANAGER_WORKSHOP_STATUS_LABELS[pendingTarget]}?`
      : "";

  const currentFlowIndex =
    workshop.status === WORKSHOP_STATUSES.CANCELLED
      ? -1
      : WORKSHOP_STATUS_FLOW.indexOf(
          workshop.status as (typeof WORKSHOP_STATUS_FLOW)[number]
        );

  return (
    <div>
      {workshop.status === WORKSHOP_STATUSES.CANCELLED ? (
        <p className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-800 dark:text-rose-200">
          This workshop is cancelled. Tap a status below or reopen as draft.
        </p>
      ) : null}

      <div className="relative mb-6 px-1 pt-1">
        <div className="absolute top-5 right-[10%] left-[10%] h-1.5 overflow-hidden rounded-full bg-muted">
          {currentFlowIndex > 0 ? (
            <div
              className="h-full rounded-full bg-emerald-500/80 transition-[width] duration-300 ease-out"
              style={{
                width: `${(currentFlowIndex / (WORKSHOP_STATUS_FLOW.length - 1)) * 100}%`,
              }}
            />
          ) : null}
        </div>
        <div className="relative grid grid-cols-5 gap-1">
          {WORKSHOP_STATUS_FLOW.map((status) => {
            const tone = stepTone(status, workshop.status);
            const isCurrent = status === workshop.status;
            return (
              <Can
                key={status}
                permission={PERMISSIONS.WORKSHOPS_UPDATE}
                fallback={
                  <WorkshopStatusCheckpoint
                    status={status}
                    tone={tone}
                    clickable={false}
                    disabled
                    onSelect={() => undefined}
                  />
                }
              >
                <WorkshopStatusCheckpoint
                  status={status}
                  tone={tone}
                  clickable={!isCurrent}
                  disabled={isPending}
                  onSelect={() => openConfirm("jump", status)}
                />
              </Can>
            );
          })}
        </div>
      </div>

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
                disabled={!nextStatus || isPending}
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
