"use client";

import { useMemo } from "react";
import { ClassLineChart } from "@/components/manager/students/class-line-chart";
import { AnalyticsChartCard } from "@/components/manager/analytics/analytics-chart-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getManagerClassAnalyticsPreview } from "@/lib/constants/manager-class-analytics-mock";

type ClassAnalyticsSectionProps = {
  classId: string;
  className: string;
  enrollmentCount: number;
};

export function ClassAnalyticsSection({
  classId,
  className,
  enrollmentCount,
}: ClassAnalyticsSectionProps) {
  const analytics = useMemo(
    () => getManagerClassAnalyticsPreview(classId, enrollmentCount),
    [classId, enrollmentCount]
  );

  const taskGradeChartData = analytics.taskGradeTrend.map((point) => ({
    session_label: point.session_label,
    average_grade: point.average_grade,
  }));

  const attendanceChartData = analytics.attendanceTrend.map((point) => ({
    session_label: point.session_label,
    attendance_rate: point.attendance_rate,
  }));

  return (
    <Card className="py-0">
      <CardHeader className="border-b bg-muted/40 py-3">
        <CardTitle>Class analytics</CardTitle>
        <p className="text-sm text-muted-foreground">
          Average task grades and attendance across completed sessions for{" "}
          {className}.
        </p>
      </CardHeader>
      <CardContent className="grid gap-6 pt-2 pb-3 lg:grid-cols-2">
        <AnalyticsChartCard
          title="Average task grades"
          description={`Class mean across graded tasks · overall ${analytics.overallAverageTaskGrade}%`}
        >
          <ClassLineChart
            data={taskGradeChartData}
            xKey="session_label"
            yDomain={[0, 100]}
            yLabel="Grade %"
            series={[
              {
                key: "average_grade",
                label: "Average task grade",
                color: "#8b5cf6",
              },
            ]}
          />
          <p className="mt-3 text-xs text-muted-foreground">
            Line chart of mean student_tasks grades per session (tasks linked via
            session_id).
          </p>
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title="Attendance per session"
          description={`Mean attendance rate · overall ${analytics.overallAttendanceRate}%`}
        >
          <ClassLineChart
            data={attendanceChartData}
            xKey="session_label"
            yDomain={[0, 100]}
            yLabel="Attendance %"
            series={[
              {
                key: "attendance_rate",
                label: "Attendance rate",
                color: "#10b981",
              },
            ]}
          />
          <p className="mt-3 text-xs text-muted-foreground">
            Percent of enrolled students marked present for each completed session.
          </p>
        </AnalyticsChartCard>
      </CardContent>
    </Card>
  );
}
