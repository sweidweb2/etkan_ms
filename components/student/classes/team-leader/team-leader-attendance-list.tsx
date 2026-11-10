"use client";

import { useMemo, useRef, useState } from "react";
import { LockIcon, UsersIcon } from "lucide-react";
import { updateTeamLeaderAttendeeAction } from "@/app/(panels)/student/classes/team-leader-actions";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { useActionStateSettled } from "@/hooks/use-action-state-settled";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { useFormActionState } from "@/hooks/use-form-action-state";
import {
  ATTENDEE_STATUS_VALUES,
  SESSION_ATTENDEE_STATUS_ACTIVE_CLASSES,
  SESSION_ATTENDEE_STATUS_LABELS,
  type AttendeeStatusValue,
} from "@/lib/constants/manager-attendee-status";
import { STUDENT_COMPUTED_GRADE_RECORD_LOCKED_ERROR } from "@/lib/manager/class-grades-access";
import { cn } from "@/lib/utils";
import type {
  ManagerSessionAttendeeRow,
  UpdateAttendeeActionState,
} from "@/types/manager-class-session-detail";

const initialState: UpdateAttendeeActionState = {};

type TeamLeaderAttendanceListProps = {
  classId: string;
  sessionId: string;
  currentUserId: string | null;
  attendees: ManagerSessionAttendeeRow[];
  lockedUserIds: string[];
  canUpdate: boolean;
  onAttendeeUpdated: (attendee: ManagerSessionAttendeeRow) => void;
};

export function TeamLeaderAttendanceList({
  classId,
  sessionId,
  currentUserId,
  attendees,
  lockedUserIds,
  canUpdate,
  onAttendeeUpdated,
}: TeamLeaderAttendanceListProps) {
  const [state, formAction, isPending] = useFormActionState(
    updateTeamLeaderAttendeeAction,
    initialState
  );
  const [savingAttendeeId, setSavingAttendeeId] = useState<string | null>(null);
  const revertAttendeeRef = useRef<ManagerSessionAttendeeRow | null>(null);
  const lockedUserIdSet = useMemo(() => new Set(lockedUserIds), [lockedUserIds]);

  useActionStateToast(state, isPending);
  useActionStateSettled(
    state,
    isPending,
    (next) => Boolean(next.success || next.error),
    (next) => {
      if (next.success && next.attendee) {
        onAttendeeUpdated(next.attendee);
      } else if (next.error && revertAttendeeRef.current) {
        onAttendeeUpdated(revertAttendeeRef.current);
      }
      revertAttendeeRef.current = null;
      setSavingAttendeeId(null);
    }
  );

  const handleStatusChange = (
    attendee: ManagerSessionAttendeeRow,
    status: AttendeeStatusValue
  ) => {
    if (status === attendee.status || isPending) {
      return;
    }

    revertAttendeeRef.current = attendee;
    setSavingAttendeeId(attendee.id);
    onAttendeeUpdated({ ...attendee, status });

    const formData = new FormData();
    formData.set("id", attendee.id);
    formData.set("class_id", classId);
    formData.set("session_id", sessionId);
    formData.set("status", status);
    formAction(formData);
  };

  if (attendees.length === 0) {
    return (
      <EmptyState
        size="sm"
        icon={UsersIcon}
        title="No students yet"
        description="No students are enrolled for this session yet."
      />
    );
  }

  return (
    <ul className="flex flex-col divide-y rounded-xl border" aria-busy={isPending}>
      {attendees.map((attendee) => {
        const locked = lockedUserIdSet.has(attendee.student_id);
        const isSelf = attendee.student_id === currentUserId;
        const isSaving = savingAttendeeId === attendee.id;
        const disabled = !canUpdate || locked || isPending;

        return (
          <li
            key={attendee.id}
            className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-center gap-2">
              {locked ? (
                <LockIcon
                  className="size-3.5 shrink-0 text-muted-foreground"
                  aria-label={STUDENT_COMPUTED_GRADE_RECORD_LOCKED_ERROR}
                />
              ) : null}
              <span className="truncate text-sm font-medium">
                {attendee.full_name}
              </span>
              {isSelf ? (
                <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                  You
                </span>
              ) : null}
              {isSaving ? <InlineSpinner className="size-3.5" /> : null}
            </div>

            <div
              role="radiogroup"
              aria-label={`Attendance for ${attendee.full_name}`}
              className="grid grid-cols-4 gap-1 sm:flex sm:shrink-0"
            >
              {ATTENDEE_STATUS_VALUES.map((status) => {
                const isActive = attendee.status === status;
                return (
                  <button
                    key={status}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    disabled={disabled}
                    title={
                      locked ? STUDENT_COMPUTED_GRADE_RECORD_LOCKED_ERROR : undefined
                    }
                    onClick={() => handleStatusChange(attendee, status)}
                    className={cn(
                      "rounded-md border border-transparent px-2.5 py-1 text-xs font-medium transition-colors",
                      "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                      "disabled:cursor-not-allowed",
                      isActive
                        ? SESSION_ATTENDEE_STATUS_ACTIVE_CLASSES[status]
                        : "text-muted-foreground hover:bg-muted disabled:hover:bg-transparent",
                      disabled && !isActive && "opacity-50"
                    )}
                  >
                    {SESSION_ATTENDEE_STATUS_LABELS[status]}
                  </button>
                );
              })}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
