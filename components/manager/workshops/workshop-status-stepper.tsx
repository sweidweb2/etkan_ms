"use client";

import {
  memo,
  useActionState,
  useCallback,
  useMemo,
  useState,
  useTransition,
  type MouseEvent,
} from "react";
import {
  Background,
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  BanIcon,
  CalendarDaysIcon,
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
import { usePermissions } from "@/components/auth/permissions-provider";
import { FieldLabel } from "@/components/auth/field-label";
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
import { hasPermissionInSet } from "@/lib/auth/permission-checks";
import { MANAGER_WORKSHOP_STATUS_LABELS } from "@/lib/constants/manager-workshop-display";
import {
  WORKSHOP_STATUSES,
  WORKSHOP_STATUS_FLOW,
  type WorkshopStatusFlowValue,
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

type StatusNodeData = {
  status: WorkshopStatusFlowValue;
  tone: StepTone;
  clickable: boolean;
  disabled: boolean;
  onSelect: (status: WorkshopStatusFlowValue) => void;
};

type WorkshopFlowNode = Node<StatusNodeData, "status">;

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

const FLOW_EDGES: Edge[] = [
  {
    id: "e-draft-proposal",
    source: WORKSHOP_STATUSES.DRAFT,
    target: WORKSHOP_STATUSES.PROPOSAL,
    type: "smoothstep",
  },
  {
    id: "e-proposal-scheduled",
    source: WORKSHOP_STATUSES.PROPOSAL,
    target: WORKSHOP_STATUSES.SCHEDULED,
    type: "smoothstep",
  },
  {
    id: "e-scheduled-in-progress",
    source: WORKSHOP_STATUSES.SCHEDULED,
    target: WORKSHOP_STATUSES.IN_PROGRESS,
    type: "smoothstep",
  },
  {
    id: "e-in-progress-completed",
    source: WORKSHOP_STATUSES.IN_PROGRESS,
    target: WORKSHOP_STATUSES.COMPLETED,
    type: "smoothstep",
  },
];

/** Horizontal lifecycle positions (React Flow coordinates). */
const NODE_POSITIONS: Record<WorkshopStatusFlowValue, { x: number; y: number }> =
  {
    draft: { x: 0, y: 88 },
    proposal: { x: 200, y: 88 },
    scheduled: { x: 400, y: 88 },
    in_progress: { x: 600, y: 88 },
    completed: { x: 800, y: 88 },
  };

function stepTone(
  status: WorkshopStatusValue,
  current: WorkshopStatusValue
): StepTone {
  if (current === WORKSHOP_STATUSES.CANCELLED) {
    return "cancelled";
  }
  const currentIndex = WORKSHOP_STATUS_FLOW.indexOf(
    current as WorkshopStatusFlowValue
  );
  const stepIndex = WORKSHOP_STATUS_FLOW.indexOf(
    status as WorkshopStatusFlowValue
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

const WorkshopStatusFlowNode = memo(function WorkshopStatusFlowNode({
  data,
}: NodeProps<WorkshopFlowNode>) {
  const Icon = STATUS_ICONS[data.status];
  const label = MANAGER_WORKSHOP_STATUS_LABELS[data.status];
  const isCurrent = data.tone === "current";
  const isDone = data.tone === "done";
  const isCancelled = data.tone === "cancelled";

  return (
    <div className="flex w-[7.5rem] flex-col items-center gap-2">
      <Handle
        type="target"
        position={Position.Left}
        className="!pointer-events-none !h-2 !w-2 !border-emerald-500/50 !bg-emerald-500/40"
      />
      {/* nopan/nodrag: keep clicks from being captured by React Flow pan/drag */}
      <button
        type="button"
        className={cn(
          "nopan nodrag flex flex-col items-center gap-2 rounded-lg px-1 py-0.5",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          data.clickable
            ? "disabled:pointer-events-none disabled:opacity-60"
            : "pointer-events-none disabled:opacity-100"
        )}
        disabled={!data.clickable || data.disabled}
        aria-label={
          data.clickable ? `Set status to ${label}` : `Status ${label}`
        }
        aria-current={isCurrent ? "step" : undefined}
        onClick={(event) => {
          event.stopPropagation();
          if (!data.clickable) {
            return;
          }
          data.onSelect(data.status);
        }}
      >
        <div
          className={cn(
            "flex size-11 items-center justify-center rounded-full border-2 shadow-sm transition-colors",
            isCurrent &&
              "border-emerald-600 bg-emerald-600 text-white ring-4 ring-emerald-500/35 dark:border-emerald-500 dark:bg-emerald-500",
            isDone &&
              !isCurrent &&
              "border-emerald-600 bg-emerald-600/90 text-white dark:border-emerald-500 dark:bg-emerald-500/90",
            data.tone === "upcoming" &&
              "border-muted-foreground/25 bg-background text-muted-foreground/70 hover:scale-105 hover:border-foreground/40 hover:text-foreground",
            isCancelled &&
              "border-rose-400/50 bg-background text-rose-400/70 hover:scale-105 hover:border-rose-500 hover:text-rose-500"
          )}
        >
          <Icon className="size-5" strokeWidth={2.25} />
        </div>
        <span
          className={cn(
            "text-center text-[11px] font-semibold leading-tight",
            isCurrent || isDone
              ? "text-emerald-700 dark:text-emerald-300"
              : isCancelled
                ? "text-rose-600/80 dark:text-rose-300/80"
                : "font-medium text-muted-foreground"
          )}
        >
          {label}
        </span>
      </button>
      <Handle
        type="source"
        position={Position.Right}
        className="!pointer-events-none !h-2 !w-2 !border-emerald-500/50 !bg-emerald-500/40"
      />
    </div>
  );
});

const nodeTypes = {
  status: WorkshopStatusFlowNode,
};

export function WorkshopStatusStepper({
  workshop,
  onStatusChanged,
}: WorkshopStatusStepperProps) {
  const permissions = usePermissions();
  const canChangeStatus = hasPermissionInSet(
    permissions,
    PERMISSIONS.WORKSHOPS_CHANGE_STATUS
  );
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

  const openJump = useCallback(
    (status: WorkshopStatusFlowValue) => {
      if (isPending || !canChangeStatus || status === workshop.status) {
        return;
      }
      setConfirmKind("jump");
      setPendingTarget(status);
    },
    [canChangeStatus, isPending, workshop.status]
  );

  const onNodeClick = useCallback(
    (_event: MouseEvent, node: Node) => {
      if (node.type !== "status") {
        return;
      }
      const data = node.data as StatusNodeData;
      if (!data.clickable || data.disabled) {
        return;
      }
      data.onSelect(data.status);
    },
    []
  );

  const nodes = useMemo<WorkshopFlowNode[]>(
    () =>
      WORKSHOP_STATUS_FLOW.map((status) => {
        const tone = stepTone(status, workshop.status);
        return {
          id: status,
          type: "status" as const,
          position: NODE_POSITIONS[status],
          data: {
            status,
            tone,
            clickable: canChangeStatus && status !== workshop.status,
            disabled: isPending,
            onSelect: openJump,
          },
          draggable: false,
          selectable: true,
          focusable: true,
        };
      }),
    [canChangeStatus, isPending, openJump, workshop.status]
  );

  const edges = useMemo<Edge[]>(
    () =>
      FLOW_EDGES.map((edge) => {
        const sourceTone = stepTone(
          edge.source as WorkshopStatusFlowValue,
          workshop.status
        );
        const isReached = sourceTone === "done";
        const isCancelled = workshop.status === WORKSHOP_STATUSES.CANCELLED;
        return {
          ...edge,
          animated: false,
          style: {
            stroke: isCancelled
              ? "oklch(0.65 0.18 20 / 0.45)"
              : isReached
                ? "oklch(0.65 0.15 155 / 0.75)"
                : "oklch(0.65 0.15 155 / 0.35)",
            strokeWidth: 2,
          },
        };
      }),
    [workshop.status]
  );

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

  return (
    <>
      <section className="min-w-0 overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <header className="flex items-center gap-2 border-b bg-muted/40 px-3 py-2.5 sm:px-4">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              Manage status
            </h3>
            <p className="text-xs text-muted-foreground">
              Advance, reverse, or cancel this workshop’s lifecycle.
            </p>
          </div>
          <Can permission={PERMISSIONS.WORKSHOPS_CHANGE_STATUS}>
            {canCancel ? (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="size-8 shrink-0"
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
        </header>

        <div className="relative flex flex-col gap-6 px-3 py-4 sm:px-4">
          {workshop.status === WORKSHOP_STATUSES.CANCELLED ? (
            <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-800 dark:text-rose-200">
              This workshop is cancelled. Tap a status below or reopen as draft.
            </p>
          ) : null}

          <div className="h-[16rem] w-full overflow-hidden rounded-lg border bg-muted/20">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodeClick={onNodeClick}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable
              nodesFocusable
              panOnDrag
              zoomOnScroll={false}
              preventScrolling={false}
              proOptions={{ hideAttribution: true }}
              minZoom={0.55}
              maxZoom={1.25}
            >
              <Background gap={18} size={1} />
            </ReactFlow>
          </div>

          <Can permission={PERMISSIONS.WORKSHOPS_CHANGE_STATUS}>
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
      </section>

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
