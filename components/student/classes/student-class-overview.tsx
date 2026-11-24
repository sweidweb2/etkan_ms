"use client";

import { format } from "date-fns";
import { CalendarIcon, CheckCircle2Icon, UsersIcon } from "lucide-react";
import { useMemo } from "react";
import { StudentAttendanceStatusBadge } from "@/components/manager/students/student-attendance-status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { GradientGlassCover } from "@/components/ui/gradient-glass-card";
import {
  MANAGER_CLASS_STATUS_BADGE_CLASSES,
  MANAGER_CLASS_STATUS_DOT_CLASSES,
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

const SESSION_RAIL_CLASSES: Record<SessionTimingLabel, string> = {
  upcoming: "bg-sky-500/70",
  in_progress: "bg-amber-500",
  completed: "bg-emerald-500/60",
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
      ? Math.round((presentCount / attendanceSlots.length) * 100)
      : null;

  const nextSession = rows.find(
    (row) => row.timing === "in_progress" || row.timing === "upcoming"
  );

  const stats = [
    {
      label: "Joined",
      value: format(new Date(classRow.joined_at), "MMM d, yyyy"),
      hint: "Enrollment date",
      icon: UsersIcon,
    },
    {
      label: "Sessions",
      value: `${completedCount} / ${rows.length}`,
      hint: rows.length === 0 ? "None scheduled" : "Completed",
      icon: CalendarIcon,
    },
    {
      label: "Attendance",
      value: attendanceRate == null ? "—" : `${attendanceRate}%`,
      hint:
        attendanceSlots.length === 0
          ? "No records yet"
          : `${presentCount} present of ${attendanceSlots.length}`,
      icon: CheckCircle2Icon,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <section className="group/gradient-glass overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_16px_36px_-28px_rgb(42_42_82/0.35)]">
        <GradientGlassCover
          cardGradient={classRow.card_gradient}
          coverImageUrl={classRow.image_url}
          coverImageAlt=""
          glassLabel={classRow.subject_name}
          className="h-28 sm:h-32"
          glassClassName="h-11 w-[min(100%,14rem)]"
        />

        <div className="flex flex-col gap-5 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold tracking-tight break-words text-balance sm:text-2xl">
                {classRow.name}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {classRow.subject_name}
                {classRow.is_team_leader ? " · Team leader" : null}
              </p>
            </div>
            <span
              className={cn(
                "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                MANAGER_CLASS_STATUS_BADGE_CLASSES[classRow.class_status]
              )}
            >
              <span
                className={cn(
                  "size-1.5 shrink-0 rounded-full",
                  MANAGER_CLASS_STATUS_DOT_CLASSES[classRow.class_status]
                )}
                aria-hidden
              />
              {MANAGER_CLASS_STATUS_LABELS[classRow.class_status]}
            </span>
          </div>

          <dl className="grid gap-3 sm:grid-cols-3">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3"
                >
                  <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Icon className="size-3.5 opacity-70" aria-hidden />
                    {stat.label}
                  </dt>
                  <dd className="mt-1.5 text-lg font-semibold tracking-tight tabular-nums">
                    {stat.value}
                  </dd>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {stat.hint}
                  </p>
                </div>
              );
            })}
          </dl>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_10px_28px_-24px_rgba(62,62,117,0.18)]">
        <div className="flex items-start justify-between gap-3 border-b border-border/50 bg-muted/25 px-5 py-4">
          <div className="min-w-0">
            <h3 className="text-base font-semibold tracking-tight">Sessions</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {rows.length === 0
                ? "Your class schedule will appear here."
                : nextSession
                  ? `Next up: ${nextSession.session.topic}`
                  : "All scheduled sessions are complete."}
            </p>
          </div>
          {rows.length > 0 ? (
            <span className="shrink-0 rounded-md bg-background/80 px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground ring-1 ring-border/60">
              {rows.length}
            </span>
          ) : null}
        </div>

        {rows.length === 0 ? (
          <div className="px-5 py-6">
            <EmptyState
              size="sm"
              icon={CalendarIcon}
              title="No sessions yet"
              description="Sessions will show up here once your class is scheduled."
            />
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {rows.map(({ session, timing, attendance }) => {
              const startsAt = new Date(session.starts_at);
              const isFocus =
                nextSession?.session.id === session.id &&
                (timing === "upcoming" || timing === "in_progress");

              return (
                <li
                  key={session.id}
                  className={cn(
                    "relative flex flex-col gap-2 px-5 py-3.5 transition-colors sm:flex-row sm:items-center sm:justify-between sm:gap-4",
                    isFocus ? "bg-primary/[0.04]" : "hover:bg-muted/30"
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "absolute inset-y-3 left-0 w-0.5 rounded-full",
                      SESSION_RAIL_CLASSES[timing],
                      isFocus ? "opacity-100" : "opacity-50"
                    )}
                  />

                  <div className="min-w-0 pl-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        className="truncate text-sm font-medium"
                        title={session.topic}
                      >
                        {session.topic}
                      </p>
                      {isFocus ? (
                        <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-primary uppercase">
                          Next
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                      Session {session.nb_order} ·{" "}
                      {format(startsAt, "EEE, MMM d")} ·{" "}
                      {format(startsAt, "h:mm a")} –{" "}
                      {format(new Date(session.ends_at), "h:mm a")}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5 pl-2 sm:pl-0">
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
