"use client";

import { useRef, useState } from "react";
import { MousePointerClickIcon } from "lucide-react";
import { loadTeamLeaderSessionAttendanceAction } from "@/app/(panels)/student/classes/team-leader-actions";
import { usePermissions } from "@/components/auth/permissions-provider";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { TeamLeaderAttendanceList } from "@/components/student/classes/team-leader/team-leader-attendance-list";
import { TeamLeaderSessionsStrip } from "@/components/student/classes/team-leader/team-leader-sessions-strip";
import { TeamLeaderTasksSection } from "@/components/student/classes/team-leader/team-leader-tasks-section";
import { EmptyState } from "@/components/ui/empty-state";
import { hasPermissionInSet } from "@/lib/auth/permission-checks";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { showErrorToast } from "@/lib/toast";
import type { ManagerClassSessionRow } from "@/types/manager-class-session";
import type { ManagerSessionAttendeeRow } from "@/types/manager-class-session-detail";
import type {
  StudentTeamLeaderBundle,
  TeamLeaderSessionAttendance,
} from "@/types/student-team-leader";

type TeamLeaderTabProps = {
  classId: string;
  className: string;
  currentUserId: string | null;
  sessions: ManagerClassSessionRow[];
  bundle: StudentTeamLeaderBundle;
};

export function TeamLeaderTab({
  classId,
  className,
  currentUserId,
  sessions,
  bundle,
}: TeamLeaderTabProps) {
  const permissions = usePermissions();
  const canUpdateAttendance = hasPermissionInSet(
    permissions,
    PERMISSIONS.TEAM_LEADER_ATTENDANCE_UPDATE
  );
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null
  );
  const [attendance, setAttendance] =
    useState<TeamLeaderSessionAttendance | null>(null);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
  const requestIdRef = useRef(0);

  const selectedSession =
    sessions.find((session) => session.id === selectedSessionId) ?? null;

  async function handleSessionSelect(sessionId: string) {
    if (sessionId === selectedSessionId) {
      return;
    }

    const requestId = ++requestIdRef.current;
    setSelectedSessionId(sessionId);
    setAttendance(null);
    setIsLoadingAttendance(true);

    const result = await loadTeamLeaderSessionAttendanceAction(
      classId,
      sessionId
    );
    if (requestId !== requestIdRef.current) {
      return;
    }

    setIsLoadingAttendance(false);
    if (result.success) {
      setAttendance(result.data);
    } else {
      showErrorToast(result.error);
    }
  }

  function handleAttendeeUpdated(attendee: ManagerSessionAttendeeRow) {
    setAttendance((current) =>
      current && current.sessionId === attendee.session_id
        ? {
            ...current,
            attendees: current.attendees.map((row) =>
              row.id === attendee.id ? { ...row, status: attendee.status } : row
            ),
          }
        : current
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <div>
          <h3 className="text-sm font-semibold">Sessions & attendance</h3>
          <p className="text-sm text-muted-foreground">
            Pick a session to take attendance for your classmates.
          </p>
        </div>

        <TeamLeaderSessionsStrip
          classId={classId}
          className={className}
          sessions={sessions}
          selectedSessionId={selectedSessionId}
          onSelect={handleSessionSelect}
        />

        {sessions.length === 0 ? null : !selectedSession ? (
          <EmptyState
            size="sm"
            icon={MousePointerClickIcon}
            title="No session selected"
            description="Select a session above to see its attendance."
          />
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              S{selectedSession.nb_order} · {selectedSession.topic}
            </p>
            {isLoadingAttendance ? (
              <div className="flex items-center gap-2 rounded-xl border px-3 py-6 text-sm text-muted-foreground">
                <InlineSpinner />
                Loading attendance…
              </div>
            ) : attendance ? (
              <TeamLeaderAttendanceList
                classId={classId}
                sessionId={attendance.sessionId}
                currentUserId={currentUserId}
                attendees={attendance.attendees}
                lockedUserIds={attendance.lockedUserIds}
                canUpdate={canUpdateAttendance}
                onAttendeeUpdated={handleAttendeeUpdated}
              />
            ) : null}
          </div>
        )}
      </section>

      <TeamLeaderTasksSection
        classId={classId}
        className={className}
        initialTasks={bundle.tasks}
        hasComputedGrades={bundle.hasComputedGrades}
      />
    </div>
  );
}
