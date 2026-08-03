"use client";

import { useActionState, useState, useTransition } from "react";
import {
  BanIcon,
  CalendarDaysIcon,
  CheckIcon,
  CircleCheckIcon,
  FileBadgeIcon,
  FilePenLineIcon,
  TimerIcon,
} from "lucide-react";
import {
  changeWorkshopStatusAction,
  updateWorkshopProposalNotesAction,
} from "@/app/manager/workshops/actions";
import { Can } from "@/components/auth/can";
import { FieldLabel } from "@/components/auth/field-label";
import { ClassTabCollapsibleSection } from "@/components/manager/students/class-tab-collapsible-section";
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
import { MANAGER_WORKSHOP_STATUS_LABELS } from "@/lib/constants/manager-workshop-display";
import {
  WORKSHOP_STATUSES,
  WORKSHOP_STATUS_FLOW,
  type WorkshopStatusValue,
} from "@/lib/constants/manager-workshop-status";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { WORKSHOP_FIELD_LIMITS } from "@/lib/constants/workshop-field-limits";
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
  UpdateWorkshopActionState,
} from "@/types/manager-workshop";

type ConfirmKind = "jump" | "next" | "back" | "cancel" | "reopen";
type StepTone = "done" | "current" | "upcoming" | "cancelled";

type WorkshopStatusStepperProps = {
  workshop: ManagerWorkshopRow;
  onStatusChanged: (workshop: ManagerWorkshopRow) => void;
};

const initialStatusState: ChangeWorkshopStatusActionState = {};
const initialNotesState: UpdateWorkshopActionState = {};

const textareaClassName = cn(
  "flex min-h-[5.5rem] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-colors",
  "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  "disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
  "dark:bg-input/30"
);

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
  const [proposalNotes, setProposalNotes] = useState(
    workshop.proposal_notes ?? ""
  );
  const proposalNotesSyncKey = `${workshop.id}:${workshop.proposal_notes ?? ""}`;
  const [prevProposalNotesSyncKey, setPrevProposalNotesSyncKey] = useState(
    proposalNotesSyncKey
  );
  const [isStatusTransitionPending, startStatusTransition] = useTransition();
  const [isNotesTransitionPending, startNotesTransition] = useTransition();
  const [statusState, statusFormAction, isStatusActionPending] = useActionState(
    changeWorkshopStatusAction,
    initialStatusState
  );
  const [notesState, notesFormAction, isNotesActionPending] = useActionState(
    updateWorkshopProposalNotesAction,
    initialNotesState
  );

  const isStatusPending = isStatusActionPending || isStatusTransitionPending;
  const isNotesPending = isNotesActionPending || isNotesTransitionPending;
  const isPending = isStatusPending || isNotesPending;

  const handleConfirmOpenChange = usePendingAwareOpenChange(
    isStatusPending,
    (open) => {
      if (!open) {
        setConfirmKind(null);
        setPendingTarget(null);
      }
    }
  );

  if (proposalNotesSyncKey !== prevProposalNotesSyncKey) {
    setPrevProposalNotesSyncKey(proposalNotesSyncKey);
    setProposalNotes(workshop.proposal_notes ?? "");
  }

  useActionStateToast(statusState, isStatusPending);
  useActionStateToast(notesState, isNotesPending);
  useActionStateSuccess(statusState, isStatusPending, (next) => {
    if (next.workshop) {
      onStatusChanged(next.workshop);
    }
    setConfirmKind(null);
    setPendingTarget(null);
  });
  useActionStateSuccess(notesState, isNotesPending, (next) => {
    if (next.workshop) {
      onStatusChanged(next.workshop);
    }
  });

  const nextStatus = getNextWorkshopStatus(workshop.status);
  const previousStatus = getPreviousWorkshopStatus(workshop.status);
  const canCancel = canCancelWorkshopStatus(workshop.status);
  const canReopen = canReopenWorkshopFromCancelled(workshop.status);
  const notesDirty =
    proposalNotes.trim() !== (workshop.proposal_notes ?? "").trim();
  const notesError =
    notesState.fieldErrors?.proposal_notes?.[0] ??
    (notesState.error && !notesState.fieldErrors ? notesState.error : undefined);

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
    startStatusTransition(() => {
      statusFormAction(formData);
    });
  }

  function submitProposalNotes() {
    const formData = new FormData();
    formData.set("id", workshop.id);
    formData.set("proposal_notes", proposalNotes);
    startNotesTransition(() => {
      notesFormAction(formData);
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
    <>
      <ClassTabCollapsibleSection
        title="Status"
        description="Advance status and keep handoff notes for the responsible entity."
        storageKey={`workshop-details-status:${workshop.id}`}
        defaultOpen
        action={<WorkshopStatusBadge status={workshop.status} />}
      >
        <div className="relative flex flex-col gap-6 px-3 py-4 sm:px-4">
          <Can permission={PERMISSIONS.WORKSHOPS_UPDATE}>
            {canCancel ? (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-3 right-3 z-20 sm:top-4 sm:right-4"
                disabled={isPending}
                aria-label="Cancel workshop"
                title="Cancel workshop"
                onClick={() =>
                  openConfirm("cancel", WORKSHOP_STATUSES.CANCELLED)
                }
              >
                <BanIcon />
              </Button>
            ) : null}
          </Can>

          {workshop.status === WORKSHOP_STATUSES.CANCELLED ? (
            <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-800 dark:text-rose-200">
              This workshop is cancelled. Tap a status below or reopen as draft.
            </p>
          ) : null}

          <div className="relative px-1 pt-1">
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
            <div className="flex flex-wrap items-center justify-center gap-2">
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
                </>
              )}
            </div>
          </Can>

          <div className="flex flex-col gap-2 border-t pt-5">
            <FieldLabel
              htmlFor="workshop-status-proposal-notes"
              label="Proposal notes"
              hint="Responsible entity / handoff notes"
            />
            <Can
              permission={PERMISSIONS.WORKSHOPS_UPDATE}
              fallback={
                <p className="whitespace-pre-wrap rounded-lg border bg-muted/30 px-3 py-2 text-sm text-foreground">
                  {workshop.proposal_notes?.trim()
                    ? workshop.proposal_notes
                    : "No proposal notes yet."}
                </p>
              }
            >
              <textarea
                id="workshop-status-proposal-notes"
                rows={4}
                maxLength={WORKSHOP_FIELD_LIMITS.proposal_notes.max}
                value={proposalNotes}
                disabled={isNotesPending}
                aria-invalid={Boolean(notesError)}
                className={textareaClassName}
                placeholder="Notes for the responsible entity you are handing this workshop to…"
                onChange={(event) => setProposalNotes(event.target.value)}
              />
              {notesError ? (
                <p className="text-sm text-destructive">{notesError}</p>
              ) : null}
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isNotesPending || !notesDirty}
                  onClick={() =>
                    setProposalNotes(workshop.proposal_notes ?? "")
                  }
                >
                  Reset
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={isNotesPending || !notesDirty}
                  onClick={submitProposalNotes}
                >
                  {isNotesPending ? (
                    <>
                      <InlineSpinner />
                      Saving…
                    </>
                  ) : (
                    "Save notes"
                  )}
                </Button>
              </div>
            </Can>
          </div>
        </div>
      </ClassTabCollapsibleSection>

      <Dialog
        open={confirmKind !== null}
        onOpenChange={handleConfirmOpenChange}
      >
        <DialogContent
          className="sm:max-w-md"
          showCloseButton={!isStatusPending}
        >
          <DialogHeader>
            <DialogTitle>{confirmTitle}</DialogTitle>
            <DialogDescription>{confirmDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={isStatusPending}
              onClick={() => handleConfirmOpenChange(false)}
            >
              Keep current
            </Button>
            <Button
              type="button"
              variant={confirmKind === "cancel" ? "destructive" : "default"}
              disabled={isStatusPending || !pendingTarget}
              onClick={submitStatusChange}
            >
              {isStatusPending ? (
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
    </>
  );
}
