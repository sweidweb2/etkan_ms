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
  CalendarClockIcon,
  CheckCircle2Icon,
  CircleDashedIcon,
  FileCheckIcon,
  HandshakeIcon,
  MapPinnedIcon,
  PauseCircleIcon,
  RouteIcon,
  UsersIcon,
  XCircleIcon,
} from "lucide-react";
import {
  changeGuestStatusAction,
  removeGuestStatusAction,
  setGuestProfileStatusAction,
} from "@/app/manager/guests/actions";
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
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { hasPermissionInSet } from "@/lib/auth/permission-checks";
import {
  GUEST_CURRENT_STATUS_LABELS,
  GUEST_CURRENT_STATUS_VALUES,
  GUEST_PIPELINE_STATUSES,
  GUEST_STATUS_LABELS,
  canMutateGuestPipeline,
  type GuestCurrentStatus,
  type GuestPipelineStatus,
  type GuestStatus,
} from "@/lib/constants/guest";
import { latestRecordedPipelineStatus } from "@/lib/manager/guests/resolve-guest-current-status";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { cn } from "@/lib/utils";
import type {
  ChangeGuestStatusActionState,
  ManagerGuestRow,
  ManagerGuestStatusEventRow,
  RemoveGuestStatusActionState,
  SetGuestProfileStatusActionState,
} from "@/types/manager-guest";

type StepTone = "current" | "done" | "idle";

type PendingStatusAction =
  | { mode: "set"; status: GuestPipelineStatus }
  | { mode: "remove"; status: GuestPipelineStatus }
  | { mode: "profile"; status: GuestCurrentStatus };

type GuestStatusStepperProps = {
  guest: ManagerGuestRow;
  statusEvents: ManagerGuestStatusEventRow[];
  onStatusChanged: (
    guest: ManagerGuestRow,
    statusEvents?: ManagerGuestStatusEventRow[]
  ) => void;
};

type StatusNodeData = {
  status: GuestPipelineStatus;
  tone: StepTone;
  disabled: boolean;
  onSelect: (status: GuestPipelineStatus, tone: StepTone) => void;
};

type StatusFlowNode = Node<StatusNodeData, "status">;

const initialStatusState: ChangeGuestStatusActionState = {};
const initialRemoveState: RemoveGuestStatusActionState = {};
const initialProfileState: SetGuestProfileStatusActionState = {};

const textareaClassName = cn(
  "flex min-h-[5rem] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-colors",
  "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  "disabled:cursor-not-allowed disabled:opacity-50",
  "dark:bg-input/30"
);

const PIPELINE_ICONS = {
  started: CircleDashedIcon,
  finished_meeting: HandshakeIcon,
  finished_parent_meeting: UsersIcon,
  chose_plan: FileCheckIcon,
  routed_correctly: MapPinnedIcon,
  finishing_routing_doc: RouteIcon,
  finished: CheckCircle2Icon,
} as const;

const PROFILE_ICONS = {
  scheduled: CalendarClockIcon,
  pending: PauseCircleIcon,
  cancelled: XCircleIcon,
  rejected: BanIcon,
  finished: CheckCircle2Icon,
} as const;

const FLOW_EDGES: Edge[] = [
  {
    id: "e-started-meeting",
    source: GUEST_PIPELINE_STATUSES.STARTED,
    target: GUEST_PIPELINE_STATUSES.FINISHED_MEETING,
    type: "smoothstep",
  },
  {
    id: "e-started-parent",
    source: GUEST_PIPELINE_STATUSES.STARTED,
    target: GUEST_PIPELINE_STATUSES.FINISHED_PARENT_MEETING,
    type: "smoothstep",
  },
  {
    id: "e-meeting-chose",
    source: GUEST_PIPELINE_STATUSES.FINISHED_MEETING,
    target: GUEST_PIPELINE_STATUSES.CHOSE_PLAN,
    type: "smoothstep",
  },
  {
    id: "e-parent-chose",
    source: GUEST_PIPELINE_STATUSES.FINISHED_PARENT_MEETING,
    target: GUEST_PIPELINE_STATUSES.CHOSE_PLAN,
    type: "smoothstep",
  },
  {
    id: "e-chose-routed",
    source: GUEST_PIPELINE_STATUSES.CHOSE_PLAN,
    target: GUEST_PIPELINE_STATUSES.ROUTED_CORRECTLY,
    type: "smoothstep",
  },
  {
    id: "e-routed-doc",
    source: GUEST_PIPELINE_STATUSES.ROUTED_CORRECTLY,
    target: GUEST_PIPELINE_STATUSES.FINISHING_ROUTING_DOC,
    type: "smoothstep",
  },
  {
    id: "e-doc-finished",
    source: GUEST_PIPELINE_STATUSES.FINISHING_ROUTING_DOC,
    target: GUEST_PIPELINE_STATUSES.FINISHED,
    type: "smoothstep",
  },
];

/** Horizontal fork schema positions (React Flow coordinates). */
const NODE_POSITIONS: Record<GuestPipelineStatus, { x: number; y: number }> = {
  started: { x: 0, y: 88 },
  finished_meeting: { x: 200, y: 8 },
  finished_parent_meeting: { x: 200, y: 168 },
  chose_plan: { x: 430, y: 88 },
  routed_correctly: { x: 640, y: 88 },
  finishing_routing_doc: { x: 850, y: 88 },
  finished: { x: 1060, y: 88 },
};

const StatusFlowNode = memo(function StatusFlowNode({
  data,
}: NodeProps<StatusFlowNode>) {
  const Icon = PIPELINE_ICONS[data.status];
  const label = GUEST_STATUS_LABELS[data.status];
  const isCurrent = data.tone === "current";
  const isDone = data.tone === "done";
  const isDisabled = data.disabled;

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
          "disabled:pointer-events-none disabled:opacity-60"
        )}
        disabled={isDisabled}
        aria-label={
          isDone || isCurrent
            ? `Remove status ${label}`
            : `Set status to ${label}`
        }
        aria-current={isCurrent ? "step" : undefined}
        onClick={(event) => {
          event.stopPropagation();
          data.onSelect(data.status, data.tone);
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
            data.tone === "idle" &&
              "border-muted-foreground/25 bg-background text-muted-foreground/70 hover:scale-105 hover:border-foreground/40 hover:text-foreground"
          )}
        >
          <Icon className="size-5" strokeWidth={2.25} />
        </div>
        <span
          className={cn(
            "text-center text-[11px] font-semibold leading-tight",
            isCurrent || isDone
              ? "text-emerald-700 dark:text-emerald-300"
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
  status: StatusFlowNode,
};

export function GuestStatusStepper({
  guest,
  statusEvents: statusEventsProp,
  onStatusChanged,
}: GuestStatusStepperProps) {
  const permissions = usePermissions();
  const canChangeStatus = hasPermissionInSet(
    permissions,
    PERMISSIONS.GUESTS_CHANGE_STATUS
  );
  const canEditPipeline =
    canChangeStatus && canMutateGuestPipeline(guest.status);
  const [statusEvents, setStatusEvents] = useState(statusEventsProp);
  const statusEventsKey = statusEventsProp.map((event) => event.id).join("|");
  const [syncedEventsKey, setSyncedEventsKey] = useState(statusEventsKey);
  if (statusEventsKey !== syncedEventsKey) {
    setStatusEvents(statusEventsProp);
    setSyncedEventsKey(statusEventsKey);
  }

  const [pendingAction, setPendingAction] = useState<PendingStatusAction | null>(
    null
  );
  const [note, setNote] = useState("");
  const [submittingMode, setSubmittingMode] = useState<
    "set" | "remove" | "profile" | null
  >(null);
  const [isTransitionPending, startTransition] = useTransition();
  const [statusState, statusFormAction, isStatusActionPending] = useActionState(
    changeGuestStatusAction,
    initialStatusState
  );
  const [removeState, removeFormAction, isRemoveActionPending] = useActionState(
    removeGuestStatusAction,
    initialRemoveState
  );
  const [profileState, profileFormAction, isProfileActionPending] =
    useActionState(setGuestProfileStatusAction, initialProfileState);

  const isSetPending =
    submittingMode === "set" &&
    (isStatusActionPending || isTransitionPending);
  const isRemovePending =
    submittingMode === "remove" &&
    (isRemoveActionPending || isTransitionPending);
  const isProfilePending =
    submittingMode === "profile" &&
    (isProfileActionPending || isTransitionPending);
  const isPending =
    isStatusActionPending ||
    isRemoveActionPending ||
    isProfileActionPending ||
    isTransitionPending;

  const recordedStatuses = useMemo(() => {
    const set = new Set<GuestStatus>();
    for (const event of statusEvents) {
      set.add(event.status);
    }
    return set;
  }, [statusEvents]);

  const highlightedPipelineStatus = useMemo(
    () => latestRecordedPipelineStatus(statusEvents),
    [statusEvents]
  );

  const handleConfirmOpenChange = usePendingAwareOpenChange(
    isPending,
    (open) => {
      if (!open) {
        setPendingAction(null);
        setNote("");
      }
    }
  );

  function applyStatusEvents(nextEvents?: ManagerGuestStatusEventRow[]) {
    if (!nextEvents) {
      return;
    }
    const nextKey = nextEvents.map((event) => event.id).join("|");
    setStatusEvents(nextEvents);
    setSyncedEventsKey(nextKey);
  }

  useActionStateToast(statusState, isSetPending);
  useActionStateToast(removeState, isRemovePending);
  useActionStateToast(profileState, isProfilePending);
  useActionStateSuccess(statusState, isSetPending, () => {
    if (statusState.guest) {
      applyStatusEvents(statusState.statusEvents);
      onStatusChanged(statusState.guest, statusState.statusEvents);
    }
    setPendingAction(null);
    setNote("");
    setSubmittingMode(null);
  });
  useActionStateSuccess(removeState, isRemovePending, () => {
    if (removeState.guest) {
      applyStatusEvents(removeState.statusEvents);
      onStatusChanged(removeState.guest, removeState.statusEvents);
    }
    setPendingAction(null);
    setNote("");
    setSubmittingMode(null);
  });
  useActionStateSuccess(profileState, isProfilePending, () => {
    if (profileState.guest) {
      onStatusChanged(profileState.guest);
    }
    setPendingAction(null);
    setNote("");
    setSubmittingMode(null);
  });

  const toneFor = useCallback(
    (status: GuestPipelineStatus): StepTone => {
      if (highlightedPipelineStatus === status) {
        return "current";
      }
      if (recordedStatuses.has(status)) {
        return "done";
      }
      return "idle";
    },
    [highlightedPipelineStatus, recordedStatuses]
  );

  const openNodeAction = useCallback(
    (target: GuestPipelineStatus, tone: StepTone) => {
      if (!canEditPipeline || isPending) {
        return;
      }
      if (tone === "done" || tone === "current") {
        setPendingAction({ mode: "remove", status: target });
      } else {
        setPendingAction({ mode: "set", status: target });
      }
      setNote("");
    },
    [canEditPipeline, isPending]
  );

  const openProfileConfirm = useCallback(
    (target: GuestCurrentStatus) => {
      if (!canChangeStatus || target === guest.status || isPending) {
        return;
      }
      setPendingAction({ mode: "profile", status: target });
      setNote("");
    },
    [canChangeStatus, guest.status, isPending]
  );

  const onNodeClick = useCallback(
    (_event: MouseEvent, node: Node) => {
      if (node.type !== "status") {
        return;
      }
      const data = node.data as StatusNodeData;
      openNodeAction(data.status, data.tone);
    },
    [openNodeAction]
  );

  const nodes = useMemo<StatusFlowNode[]>(() => {
    return (Object.keys(NODE_POSITIONS) as GuestPipelineStatus[]).map(
      (status) => ({
        id: status,
        type: "status" as const,
        position: NODE_POSITIONS[status],
        data: {
          status,
          tone: toneFor(status),
          disabled: isPending || !canEditPipeline,
          onSelect: openNodeAction,
        },
        draggable: false,
        selectable: true,
        focusable: true,
      })
    );
  }, [canEditPipeline, isPending, openNodeAction, toneFor]);

  const edges = useMemo<Edge[]>(
    () =>
      FLOW_EDGES.map((edge) => ({
        ...edge,
        animated: false,
        style: {
          stroke: "oklch(0.65 0.15 155 / 0.55)",
          strokeWidth: 2,
        },
      })),
    []
  );

  function submitPendingAction() {
    if (!pendingAction) {
      return;
    }
    const formData = new FormData();
    formData.set("id", guest.id);
    formData.set("status", pendingAction.status);
    if (pendingAction.mode === "set" || pendingAction.mode === "profile") {
      formData.set("note", note);
    }
    setSubmittingMode(pendingAction.mode);
    startTransition(() => {
      if (pendingAction.mode === "remove") {
        removeFormAction(formData);
      } else if (pendingAction.mode === "profile") {
        profileFormAction(formData);
      } else {
        statusFormAction(formData);
      }
    });
  }

  const isRemoveMode = pendingAction?.mode === "remove";
  const isProfileMode = pendingAction?.mode === "profile";
  const pendingLabel = pendingAction
    ? pendingAction.mode === "profile"
      ? GUEST_CURRENT_STATUS_LABELS[pendingAction.status]
      : GUEST_STATUS_LABELS[pendingAction.status]
    : null;

  return (
    <>
      <section className="min-w-0 overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <header className="border-b bg-muted/40 px-3 py-2.5 sm:px-4">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            Manage status
          </h3>
          <p className="text-xs text-muted-foreground">
            Profile status is scheduled, pending, cancelled, rejected, or
            finished. The schema log can be recorded or removed only while the
            guest is pending.
          </p>
        </header>

        <div className="space-y-5 px-3 py-4 sm:px-4">
          <div className="h-[18rem] w-full overflow-hidden rounded-lg border bg-muted/20">
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

          <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-muted-foreground">
              Current:{" "}
              <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                {GUEST_CURRENT_STATUS_LABELS[guest.status]}
              </span>
              {!canEditPipeline ? " (schema locked)" : null}
            </div>
            {canChangeStatus ? (
              <div className="flex flex-wrap gap-2">
                {GUEST_CURRENT_STATUS_VALUES.map((status) => {
                  const Icon = PROFILE_ICONS[status];
                  const active = guest.status === status;
                  return (
                    <Button
                      key={status}
                      type="button"
                      size="sm"
                      variant={active ? "secondary" : "outline"}
                      disabled={isPending || active}
                      className={
                        active
                          ? "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-600/90 hover:text-white dark:border-emerald-500 dark:bg-emerald-500"
                          : undefined
                      }
                      onClick={() => openProfileConfirm(status)}
                    >
                      <Icon data-icon="inline-start" />
                      {GUEST_CURRENT_STATUS_LABELS[status]}
                    </Button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <Dialog
        open={pendingAction !== null}
        onOpenChange={handleConfirmOpenChange}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
          <DialogHeader>
            <DialogTitle>
              {pendingAction && pendingLabel
                ? isRemoveMode
                  ? `Remove ${pendingLabel}?`
                  : isProfileMode
                    ? `Set status to ${pendingLabel}?`
                    : `Record ${pendingLabel}?`
                : "Change status"}
            </DialogTitle>
            <DialogDescription>
              {pendingAction && pendingLabel
                ? isRemoveMode
                  ? `This deletes ${pendingLabel} from the pipeline log. Profile status stays ${GUEST_CURRENT_STATUS_LABELS[guest.status]}.`
                  : isProfileMode
                    ? `Change profile status from ${GUEST_CURRENT_STATUS_LABELS[guest.status]} to ${pendingLabel}. Pipeline history is unchanged.`
                    : `Record ${pendingLabel} in the pipeline log. Profile status stays pending.`
                : null}
            </DialogDescription>
          </DialogHeader>

          {!isRemoveMode ? (
            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="guest-status-note"
                label="Note"
                hint="Optional"
              />
              <textarea
                id="guest-status-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={2000}
                disabled={isPending}
                className={textareaClassName}
                placeholder="Why this status?"
              />
            </div>
          ) : null}

          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleConfirmOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={isRemoveMode ? "destructive" : "default"}
              onClick={submitPendingAction}
              disabled={isPending || !pendingAction}
            >
              {isPending ? (
                <>
                  <InlineSpinner />
                  {isRemoveMode ? "Removing" : "Saving"}
                </>
              ) : isRemoveMode ? (
                "Remove status"
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
