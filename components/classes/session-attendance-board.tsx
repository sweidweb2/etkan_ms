"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import type { LucideIcon } from "lucide-react";
import {
  CheckIcon,
  ClockIcon,
  LockIcon,
  ShieldCheckIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { updateAttendeeAction } from "@/app/manager/classes/actions";
import { usePermissions } from "@/components/auth/permissions-provider";
import { EmptyState } from "@/components/ui/empty-state";
import { hasPermissionInSet } from "@/lib/auth/permission-checks";
import {
  ATTENDEE_STATUS_VALUES,
  SESSION_ATTENDEE_STATUS_ACTIVE_CLASSES,
  SESSION_ATTENDEE_STATUS_LABELS,
  type AttendeeStatusValue,
} from "@/lib/constants/manager-attendee-status";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { STUDENT_COMPUTED_GRADE_RECORD_LOCKED_ERROR } from "@/lib/manager/class-grades-access";
import { useActionStateSettled } from "@/hooks/use-action-state-settled";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { cn } from "@/lib/utils";
import type {
  ManagerSessionAttendeeRow,
  UpdateAttendeeActionState,
} from "@/types/manager-class-session-detail";

const initialAttendeeState: UpdateAttendeeActionState = {};

const ATTENDEE_STATUS_ICONS: Record<AttendeeStatusValue, LucideIcon> = {
  present: CheckIcon,
  absent: XIcon,
  late: ClockIcon,
  excused: ShieldCheckIcon,
};

const DRAG_THRESHOLD_PX = 4;
const ATTENDANCE_LANE_ATTR = "data-attendance-status";

type DragSession = {
  attendeeId: string;
  fromStatus: AttendeeStatusValue;
  label: string;
  pointerId: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  x: number;
  y: number;
  originClientX: number;
  originClientY: number;
  started: boolean;
};

type SessionAttendanceBoardProps = {
  classId: string;
  sessionId: string;
  attendees: ManagerSessionAttendeeRow[];
  lockedUserIds: string[];
  onAttendeeUpdated: (attendee: ManagerSessionAttendeeRow) => void;
};

function isAttendeeStatus(value: string | null | undefined): value is AttendeeStatusValue {
  return (
    value === "present" ||
    value === "absent" ||
    value === "late" ||
    value === "excused"
  );
}

function findLaneStatusAtPoint(x: number, y: number): AttendeeStatusValue | null {
  const elements = document.elementsFromPoint(x, y);
  for (const element of elements) {
    if (!(element instanceof Element)) {
      continue;
    }
    const lane = element.closest(`[${ATTENDANCE_LANE_ATTR}]`);
    const status = lane?.getAttribute(ATTENDANCE_LANE_ATTR);
    if (isAttendeeStatus(status)) {
      return status;
    }
  }
  return null;
}

function groupAttendeesByStatus(
  attendees: ManagerSessionAttendeeRow[]
): Record<AttendeeStatusValue, ManagerSessionAttendeeRow[]> {
  const groups: Record<AttendeeStatusValue, ManagerSessionAttendeeRow[]> = {
    present: [],
    absent: [],
    late: [],
    excused: [],
  };

  for (const attendee of attendees) {
    const status = isAttendeeStatus(attendee.status)
      ? attendee.status
      : "present";
    groups[status].push(attendee);
  }

  return groups;
}

export function SessionAttendanceBoard({
  classId,
  sessionId,
  attendees,
  lockedUserIds,
  onAttendeeUpdated,
}: SessionAttendanceBoardProps) {
  const permissions = usePermissions();
  const canUpdate = hasPermissionInSet(
    permissions,
    PERMISSIONS.ATTENDANCE_UPDATE
  );
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    updateAttendeeAction,
    initialAttendeeState
  );
  const isPending = isActionPending || isTransitionPending;
  const lockedUserIdSet = useMemo(
    () => new Set(lockedUserIds),
    [lockedUserIds]
  );
  const revertAttendeeRef = useRef<ManagerSessionAttendeeRow | null>(null);
  const dragRef = useRef<DragSession | null>(null);
  const [drag, setDrag] = useState<DragSession | null>(null);
  const [hoverStatus, setHoverStatus] = useState<AttendeeStatusValue | null>(
    null
  );

  const grouped = useMemo(() => groupAttendeesByStatus(attendees), [attendees]);

  useActionStateToast(state, isPending);

  useActionStateSettled(
    state,
    isPending,
    (next) => Boolean(next.success || next.error),
    (next) => {
      if (next.success && next.attendee) {
        onAttendeeUpdated(next.attendee);
        revertAttendeeRef.current = null;
        return;
      }

      if (next.error && revertAttendeeRef.current) {
        onAttendeeUpdated(revertAttendeeRef.current);
        revertAttendeeRef.current = null;
      }
    }
  );

  const commitStatusChange = useCallback(
    (attendee: ManagerSessionAttendeeRow, status: AttendeeStatusValue) => {
      if (status === attendee.status) {
        return;
      }

      revertAttendeeRef.current = attendee;
      onAttendeeUpdated({ ...attendee, status });

      const formData = new FormData();
      formData.set("id", attendee.id);
      formData.set("class_id", classId);
      formData.set("session_id", sessionId);
      formData.set("status", status);

      startTransition(() => {
        formAction(formData);
      });
    },
    [classId, formAction, onAttendeeUpdated, sessionId]
  );

  const endDrag = useCallback(
    (clientX: number, clientY: number, cancelled: boolean) => {
      const session = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      setHoverStatus(null);

      if (!session || cancelled || !session.started) {
        return;
      }

      const nextStatus = findLaneStatusAtPoint(clientX, clientY);
      if (!nextStatus || nextStatus === session.fromStatus) {
        return;
      }

      const attendee = attendees.find((row) => row.id === session.attendeeId);
      if (!attendee) {
        return;
      }

      commitStatusChange(attendee, nextStatus);
    },
    [attendees, commitStatusChange]
  );

  useEffect(() => {
    if (!drag) {
      return;
    }

    const onPointerMove = (event: PointerEvent) => {
      const session = dragRef.current;
      if (!session || event.pointerId !== session.pointerId) {
        return;
      }

      const nextX = event.clientX - session.offsetX;
      const nextY = event.clientY - session.offsetY;
      const movedEnough =
        session.started ||
        Math.hypot(
          event.clientX - session.originClientX,
          event.clientY - session.originClientY
        ) >= DRAG_THRESHOLD_PX;

      if (!movedEnough) {
        return;
      }

      const next: DragSession = {
        ...session,
        started: true,
        x: nextX,
        y: nextY,
      };
      dragRef.current = next;
      setDrag(next);
      setHoverStatus(findLaneStatusAtPoint(event.clientX, event.clientY));
    };

    const onPointerUp = (event: PointerEvent) => {
      const session = dragRef.current;
      if (!session || event.pointerId !== session.pointerId) {
        return;
      }
      endDrag(event.clientX, event.clientY, false);
    };

    const onPointerCancel = (event: PointerEvent) => {
      const session = dragRef.current;
      if (!session || event.pointerId !== session.pointerId) {
        return;
      }
      endDrag(event.clientX, event.clientY, true);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        const session = dragRef.current;
        if (!session) {
          return;
        }
        endDrag(session.x + session.offsetX, session.y + session.offsetY, true);
      }
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [drag, endDrag]);

  const handleChipPointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
    attendee: ManagerSessionAttendeeRow
  ) => {
    if (
      !canUpdate ||
      isPending ||
      lockedUserIdSet.has(attendee.student_id) ||
      event.button !== 0
    ) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const session: DragSession = {
      attendeeId: attendee.id,
      fromStatus: attendee.status,
      label: attendee.full_name,
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
      x: rect.left,
      y: rect.top,
      originClientX: event.clientX,
      originClientY: event.clientY,
      started: false,
    };

    dragRef.current = session;
    setDrag(session);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  return (
    <div className="flex flex-col gap-3">
      {attendees.length === 0 ? (
        <EmptyState
          size="sm"
          icon={UsersIcon}
          title="No attendees yet"
          description="No attendees recorded for this session yet."
        />
      ) : null}

      <div
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
        aria-busy={isPending}
        aria-label="Attendance status board"
      >
        {ATTENDEE_STATUS_VALUES.map((status) => {
          const Icon = ATTENDEE_STATUS_ICONS[status];
          const label = SESSION_ATTENDEE_STATUS_LABELS[status];
          const laneAttendees = grouped[status];
          const isDropTarget = drag?.started === true && hoverStatus === status;

          return (
            <section
              key={status}
              data-attendance-status={status}
              aria-label={`${label}, ${laneAttendees.length} students`}
              className={cn(
                "flex w-[min(100%,14.5rem)] shrink-0 flex-col rounded-xl border border-foreground/8 bg-muted/35 transition-colors duration-150 @lg/panel:w-0 @lg/panel:min-w-0 @lg/panel:flex-1",
                isDropTarget && "border-primary/40 bg-primary/8"
              )}
            >
              <div className="flex items-center gap-2 border-b border-foreground/8 px-3 py-2">
                <span
                  className={cn(
                    "inline-flex size-6 shrink-0 items-center justify-center rounded-md",
                    SESSION_ATTENDEE_STATUS_ACTIVE_CLASSES[status]
                  )}
                  aria-hidden
                >
                  <Icon className="size-3.5" />
                </span>
                <h3 className="min-w-0 truncate text-sm font-medium tracking-tight">
                  {label}
                </h3>
                <span className="ml-auto tabular-nums text-xs text-muted-foreground">
                  {laneAttendees.length}
                </span>
              </div>

              <div className="flex min-h-28 flex-1 flex-col gap-2 px-2.5 py-2.5">
                {laneAttendees.length === 0 ? (
                  <p className="px-1 py-2 text-xs text-muted-foreground">
                    {canUpdate ? "Drop students here" : "No students"}
                  </p>
                ) : (
                  laneAttendees.map((attendee) => {
                    const locked = lockedUserIdSet.has(attendee.student_id);
                    const isSource =
                      drag?.attendeeId === attendee.id && drag.started;
                    const canDrag = canUpdate && !isPending && !locked;

                    return (
                      <AttendanceNameChip
                        key={attendee.id}
                        attendee={attendee}
                        status={status}
                        locked={locked}
                        canDrag={canDrag}
                        isDragging={isSource}
                        onPointerDown={handleChipPointerDown}
                        onMarkAbsent={
                          canDrag && status === "present"
                            ? () => commitStatusChange(attendee, "absent")
                            : undefined
                        }
                      />
                    );
                  })
                )}
              </div>
            </section>
          );
        })}
      </div>

      {drag?.started && typeof document !== "undefined"
        ? createPortal(
            <div
              aria-hidden
              className={cn(
                "pointer-events-none fixed z-[200] inline-flex max-w-[14rem] items-center truncate rounded-md px-2.5 py-1.5 text-sm font-medium shadow-md",
                SESSION_ATTENDEE_STATUS_ACTIVE_CLASSES[drag.fromStatus]
              )}
              style={{
                left: drag.x,
                top: drag.y,
                width: drag.width,
                minHeight: drag.height,
              }}
            >
              {drag.label}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

function AttendanceNameChip({
  attendee,
  status,
  locked,
  canDrag,
  isDragging,
  onPointerDown,
  onMarkAbsent,
}: {
  attendee: ManagerSessionAttendeeRow;
  status: AttendeeStatusValue;
  locked: boolean;
  canDrag: boolean;
  isDragging: boolean;
  onPointerDown: (
    event: ReactPointerEvent<HTMLButtonElement>,
    attendee: ManagerSessionAttendeeRow
  ) => void;
  onMarkAbsent?: () => void;
}) {
  const label = SESSION_ATTENDEE_STATUS_LABELS[status];
  const editedBy = attendee.updated_by_name
    ? `Edited by ${attendee.updated_by_name}`
    : null;
  const baseTitle = locked
    ? STUDENT_COMPUTED_GRADE_RECORD_LOCKED_ERROR
    : canDrag
      ? `Drag to change status · ${attendee.full_name}`
      : `${attendee.full_name} · ${label}`;
  const title = editedBy ? `${baseTitle} · ${editedBy}` : baseTitle;
  const nameBlock = (
    <span className="flex min-w-0 flex-col">
      <span className="truncate">{attendee.full_name}</span>
      {editedBy ? (
        <span className="truncate text-[11px] font-normal opacity-75">
          {editedBy}
        </span>
      ) : null}
    </span>
  );

  if (!canDrag) {
    return (
      <span
        title={title}
        aria-label={`Attendance for ${attendee.full_name}: ${label}${
          locked ? " (locked)" : ""
        }`}
        className={cn(
          "inline-flex w-full items-center gap-1.5 truncate rounded-md px-2.5 py-1.5 text-sm font-medium",
          SESSION_ATTENDEE_STATUS_ACTIVE_CLASSES[status],
          locked && "opacity-70"
        )}
      >
        {locked ? (
          <LockIcon className="size-3.5 shrink-0 opacity-80" aria-hidden />
        ) : null}
        {nameBlock}
      </span>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex w-full items-center gap-0.5 rounded-md",
        SESSION_ATTENDEE_STATUS_ACTIVE_CLASSES[status],
        isDragging && "opacity-35"
      )}
    >
      <button
        type="button"
        title={title}
        aria-label={`Attendance for ${attendee.full_name}: ${label}. Drag to another status.`}
        aria-grabbed={isDragging}
        onPointerDown={(event) => onPointerDown(event, attendee)}
        className={cn(
          "min-w-0 flex-1 touch-none select-none truncate rounded-md px-2.5 py-1.5 text-left text-sm font-medium",
          "cursor-grab active:cursor-grabbing",
          "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        )}
      >
        {nameBlock}
      </button>
      {onMarkAbsent ? (
        <button
          type="button"
          title={`Mark ${attendee.full_name} absent`}
          aria-label={`Mark ${attendee.full_name} absent`}
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.stopPropagation();
            onMarkAbsent();
          }}
          className={cn(
            "mr-1 inline-flex size-6 shrink-0 items-center justify-center rounded-md",
            "text-current/80 hover:bg-foreground/10 hover:text-current",
            "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          )}
        >
          <XIcon className="size-3.5" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
