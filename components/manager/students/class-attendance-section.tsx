"use client";

import { format } from "date-fns";
import { ClassLineChart } from "@/components/manager/students/class-line-chart";
import { ClassTabCollapsibleSection } from "@/components/manager/students/class-tab-collapsible-section";
import { StudentAttendanceStatusBadge } from "@/components/manager/students/student-attendance-status-badge";
import {
  getAttendanceDisplayKey,
  MANAGER_STUDENT_ATTENDANCE_SLOT_CLASSES,
} from "@/lib/constants/manager-student-attendance-display";
import {
  MANAGER_STUDENT_ATTENDANCE_SLOTS_MAX_HEIGHT_CLASS,
  MANAGER_STUDENT_ATTENDANCE_SLOTS_MAX_VISIBLE,
} from "@/lib/constants/manager-student-class-slots";
import { cn } from "@/lib/utils";
import type { ManagerStudentClassTabDetail } from "@/types/manager-student-class-detail";

type ClassAttendanceSectionProps = {
  detail: ManagerStudentClassTabDetail;
};

export function ClassAttendanceSection({ detail }: ClassAttendanceSectionProps) {
  const attendanceOverflow =
    detail.attendanceSlots.length > MANAGER_STUDENT_ATTENDANCE_SLOTS_MAX_VISIBLE;
  const chartData = detail.attendanceTrend.map((point) => ({
    session_label: point.session_label,
    cumulative_present: point.cumulative_present,
    streak: point.streak,
    cumulative_rate: point.cumulative_rate,
  }));

  return (
    <ClassTabCollapsibleSection
      title="Attendance"
      description="Session attendance slots and cumulative attendance trend."
    >
      <div className="grid min-h-[22rem] min-w-0 gap-6 p-5 lg:grid-cols-2 lg:items-stretch">
        <div className="flex min-h-0 min-w-0 flex-col space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Session slots
            </p>
            {attendanceOverflow ? (
              <p className="text-[11px] text-muted-foreground">
                {detail.attendanceSlots.length} total · scroll
              </p>
            ) : null}
          </div>
          {detail.attendanceSlots.length === 0 ? (
            <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              No sessions recorded for this class yet.
            </p>
          ) : (
            <div
              className={cn(
                "grid min-h-0 flex-1 grid-cols-2 content-start gap-2.5 overflow-y-auto overscroll-y-contain sm:grid-cols-3",
                MANAGER_STUDENT_ATTENDANCE_SLOTS_MAX_HEIGHT_CLASS
              )}
            >
              {detail.attendanceSlots.map((slot) => (
                <div
                  key={slot.session_id}
                  className={cn(
                    "rounded-lg border px-3 py-2",
                    MANAGER_STUDENT_ATTENDANCE_SLOT_CLASSES[
                      getAttendanceDisplayKey(slot.status)
                    ]
                  )}
                >
                  <p className="text-xs font-semibold">{slot.session_label}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {format(new Date(slot.session_at), "MMM d, yyyy")}
                  </p>
                  <div className="mt-2">
                    <StudentAttendanceStatusBadge status={slot.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex min-h-[20rem] min-w-0 flex-col space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Cumulative streak trend
          </p>
          {detail.attendanceTrend.length === 0 ? (
            <p className="flex min-h-[18rem] flex-1 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
              No attendance trend available yet.
            </p>
          ) : (
            <>
              <ClassLineChart
                className="min-h-[18rem] flex-1"
                data={chartData}
                xKey="session_label"
                yLabel="Count"
                series={[
                  {
                    key: "cumulative_present",
                    label: "Cumulative present",
                    color: "#10b981",
                  },
                  {
                    key: "streak",
                    label: "Current streak",
                    color: "#0ea5e9",
                  },
                ]}
              />
              <p className="text-xs text-muted-foreground">
                Present sessions increase cumulative attendance; absent sessions
                reset the streak.
              </p>
            </>
          )}
        </div>
      </div>
    </ClassTabCollapsibleSection>
  );
}
