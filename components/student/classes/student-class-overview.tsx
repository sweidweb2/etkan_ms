"use client";

import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useMemo } from "react";
import { StudentAttendanceStatusBadge } from "@/components/manager/students/student-attendance-status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  MANAGER_CLASS_STATUS_BADGE_CLASSES,
  MANAGER_CLASS_STATUS_LABELS,
} from "@/lib/constants/manager-class-display";
import { cn } from "@/lib/utils";
import {
  getSessionTimingLabel,
  type ManagerClassSessionRow,
  type SessionTimingLabel,
} from "@/types/manager-class-session";
import type { ManagerStudentClassRow } from "@/types/manager-student-class";
import type { ManagerStudentSessionAttendanceRow } from "@/types/manager-student-class-detail";

type StudentClassOverviewProps = {
  classRow: ManagerStudentClassRow;
  sessions: ManagerClassSessionRow[];
  attendanceSlots: ManagerStudentSessionAttendanceRow[];
};

const SESSION_TIMING_LABELS: Record<SessionTimingLabel, string> = {
  upcoming: "Upcoming",
  in_progress: "In progress",
  completed: "Completed",
};

const SESSION_TIMING_CLASSES: Record<SessionTimingLabel, string> = {
  upcoming: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  in_progress: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  completed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
};

export function StudentClassOverview({
  classRow,
  sessions,
  attendanceSlots,
}: StudentClassOverviewProps) {
  const rows = useMemo(() => {
    const attendanceBySession = new Map(
      attendanceSlots.map((slot) => [slot.session_id, slot.status])
    );

    return [...sessions]
      .sort(
        (left, right) =>
          left.nb_order - right.nb_order ||
          new Date(left.starts_at).getTime() -
            new Date(right.starts_at).getTime()
      )
      .map((session) => ({
        session,
        timing: getSessionTimingLabel(session),
        attendance: attendanceBySession.get(session.id),
      }));
  }, [sessions, attendanceSlots]);

  const completedCount = rows.filter(
    (row) => row.timing === "completed"
  ).length;
  const presentCount = attendanceSlots.filter(
    (slot) => slot.status === true
  ).length;
  const attendanceRate =
    attendanceSlots.length > 0
      ? `${Math.round((presentCount / attendanceSlots.length) * 100)}%`
      : "—";

  const stats = [
    {
      label: "Joined",
      value: format(new Date(classRow.joined_at), "MMM d, yyyy"),
    },
    { label: "Sessions", value: `${completedCount} / ${rows.length} done` },
    { label: "Attendance", value: attendanceRate },
  ];

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <section className="flex flex-col gap-4 rounded-xl border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold break-words">
              {classRow.name}
            </h2>
            <p className="mt-0.5 text-sm break-words text-muted-foreground">
              {classRow.subject_name}
            </p>
          </div>
          <span
            className={cn(
              "inline-flex shrink-0 rounded-md px-2 py-0.5 text-xs font-medium",
              MANAGER_CLASS_STATUS_BADGE_CLASSES[classRow.class_status]
            )}
          >
            {MANAGER_CLASS_STATUS_LABELS[classRow.class_status]}
          </span>
        </div>

        <dl className="flex flex-wrap gap-x-10 gap-y-3">
          {stats.map((stat) => (
            <div key={stat.label}>
              <dt className="text-xs text-muted-foreground">{stat.label}</dt>
              <dd className="mt-0.5 text-sm font-medium tabular-nums">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="overflow-hidden rounded-xl border bg-card">
        <h3 className="px-5 pt-4 pb-2 text-sm font-semibold">Sessions</h3>

        {rows.length === 0 ? (
          <div className="px-5 pb-5">
            <EmptyState
              size="sm"
              icon={CalendarIcon}
              title="No sessions yet"
              description="Sessions will show up here once your class is scheduled."
            />
          </div>
        ) : (
          <ul className="divide-y">
            {rows.map(({ session, timing, attendance }) => {
              const startsAt = new Date(session.starts_at);

              return (
                <li
                  key={session.id}
                  className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium" title={session.topic}>
                      {session.topic}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                      Session {session.nb_order} ·{" "}
                      {format(startsAt, "EEE, MMM d")} ·{" "}
                      {format(startsAt, "h:mm a")} –{" "}
                      {format(new Date(session.ends_at), "h:mm a")}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {attendance !== undefined ? (
                      <StudentAttendanceStatusBadge status={attendance} />
                    ) : null}
                    <span
                      className={cn(
                        "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
                        SESSION_TIMING_CLASSES[timing]
                      )}
                    >
                      {SESSION_TIMING_LABELS[timing]}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
