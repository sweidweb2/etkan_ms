"use client";

import { ClassLineChart } from "@/components/manager/students/class-line-chart";
import { AnalyticsChartCard } from "@/components/manager/analytics/analytics-chart-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ManagerClassAnalyticsPreview } from "@/types/manager-class-analytics";

type ClassAnalyticsSectionProps = {
  className: string;
  analytics: ManagerClassAnalyticsPreview;
};

const NO_GRADED_TASKS_MESSAGE =
  "No graded tasks yet. Set student task status to Graded or Late (with a grade) on session task pages to populate this chart.";

function formatTaskTooltipExtra(
  point: Record<string, string | number | null>
) {
  const taskCount = Number(point.task_count ?? 0);
  const gradedCount = Number(point.graded_count ?? 0);

  if (taskCount <= 0) {
    return [];
  }

  const taskLabel = taskCount === 1 ? "task" : "tasks";
  const rowLabel = gradedCount === 1 ? "graded row" : "graded rows";

  return [`${taskCount} ${taskLabel} · ${gradedCount} ${rowLabel}`];
}

export function ClassAnalyticsSection({
  className,
  analytics,
}: ClassAnalyticsSectionProps) {
  const hasGradedTaskData = analytics.taskGradeTrend.some(
    (point) => point.graded_count > 0
  );

  const taskGradeChartData = analytics.taskGradeTrend.map((point) => ({
    session_label: point.session_label,
    average_grade: point.graded_count > 0 ? point.average_grade : null,
    task_count: point.task_count,
    graded_count: point.graded_count,
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
          Average task grades and attendance across sessions for {className}.
        </p>
      </CardHeader>
      <CardContent className="grid gap-6 pt-2 pb-3 lg:grid-cols-2">
        <AnalyticsChartCard
          title="Average task grades"
          description={
            hasGradedTaskData
              ? `Class mean across graded tasks · overall ${analytics.overallAverageTaskGrade}%`
              : "Grade student tasks to see session trends"
          }
        >
          <ClassLineChart
            data={taskGradeChartData}
            xKey="session_label"
            yDomain={[0, 100]}
            yLabel="Grade %"
            emptyMessage={NO_GRADED_TASKS_MESSAGE}
            getTooltipExtraLines={formatTaskTooltipExtra}
            series={[
              {
                key: "average_grade",
                label: "Average task grade",
                color: "#8b5cf6",
              },
            ]}
          />
          <p className="mt-3 text-xs text-muted-foreground">
            Sessions appear once at least one task has graded student rows.
            Multiple tasks in a session are averaged equally.
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
            Percent of enrolled students marked present for each session.
          </p>
        </AnalyticsChartCard>
      </CardContent>
    </Card>
  );
}
