"use client";

import { format } from "date-fns";
import { ClassLineChart } from "@/components/manager/students/class-line-chart";
import { StudentAttendanceStatusBadge } from "@/components/manager/students/student-attendance-status-badge";
import {
  MANAGER_STUDENT_ATTENDANCE_SLOT_CLASSES,
} from "@/lib/constants/manager-student-attendance-display";
import { getManagerStudentClassDetailPreview } from "@/lib/manager/get-manager-student-class-detail-preview";
import { cn } from "@/lib/utils";

type ClassAttendanceSectionProps = {
  userId: string;
  classId: string;
};

export function ClassAttendanceSection({
  userId,
  classId,
}: ClassAttendanceSectionProps) {
  const detail = getManagerStudentClassDetailPreview(userId, classId);
  const chartData = detail.attendanceTrend.map((point) => ({
    session_label: point.session_label,
    cumulative_present: point.cumulative_present,
    streak: point.streak,
    cumulative_rate: point.cumulative_rate,
  }));

  return (
    <section className="min-w-0 rounded-xl ring-1 ring-foreground/10">
      <div className="border-b bg-muted/40 px-4 py-3">
        <h3 className="text-sm font-semibold">Attendance</h3>
        <p className="text-xs text-muted-foreground">
          Session slots (linked via tasks.session_id) and cumulative streak trend.
        </p>
      </div>

      <div className="grid min-h-[22rem] min-w-0 gap-6 p-5 lg:grid-cols-2 lg:items-stretch">
        <div className="flex min-h-[20rem] min-w-0 flex-col space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Session slots
          </p>
          <div className="grid min-h-[18rem] flex-1 grid-cols-2 content-start gap-2.5 overflow-y-auto sm:grid-cols-3">
            {detail.attendanceSlots.map((slot) => (
              <div
                key={slot.session_id}
                className={cn(
                  "rounded-lg border px-3 py-2",
                  MANAGER_STUDENT_ATTENDANCE_SLOT_CLASSES[slot.status]
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
        </div>

        <div className="flex min-h-[20rem] min-w-0 flex-col space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Cumulative streak trend
          </p>
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
            Present + late count toward cumulative attendance; absent resets streak.
            Excused is neutral in this preview.
          </p>
        </div>
      </div>
    </section>
  );
}
