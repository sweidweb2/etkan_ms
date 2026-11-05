"use client";

import { ClassLineChart } from "@/components/manager/students/class-line-chart";
import { ClassTabCollapsibleSection } from "@/components/manager/students/class-tab-collapsible-section";
import { AnalyticsChartCard } from "@/components/manager/analytics/analytics-chart-card";
import { COLLAPSIBLE_SECTION_STORAGE_KEYS } from "@/lib/constants/collapsible-section-storage";
import {
  formatGroupGradeLevelTick,
  GROUP_GRADE_LEVEL_Y_TICKS,
} from "@/lib/manager/class-group-grade-analytics";
import type { ManagerClassAnalyticsPreview } from "@/types/manager-class-analytics";

type ClassAnalyticsSectionProps = {
  className: string;
  analytics: ManagerClassAnalyticsPreview;
  /** When false, section stays open with no expand/collapse controls. */
  collapsible?: boolean;
};

const NO_GRADED_TASKS_MESSAGE =
  "No graded tasks yet. Set student task status to Graded or Late (with a grade) on session task pages to populate this chart.";

const NO_GROUP_GRADES_MESSAGE =
  "No group grades yet. Set a group grade level on session settings to populate this chart.";

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
  collapsible = true,
}: ClassAnalyticsSectionProps) {
  const hasGradedTaskData = analytics.taskGradeTrend.some(
    (point) => point.graded_count > 0
  );
  const hasGroupGradeData = analytics.groupGradeTrend.length > 0;

  const taskGradeChartData = analytics.taskGradeTrend.map((point) => ({
    session_label: point.session_label,
    average_grade: point.graded_count > 0 ? point.average_grade : null,
    task_count: point.task_count,
    graded_count: point.graded_count,
  }));

  const groupGradeChartData = analytics.groupGradeTrend.map((point) => ({
    session_label: point.session_label,
    group_grade_index: point.group_grade_index,
    group_grade_label: point.group_grade_label,
  }));

  const attendanceChartData = analytics.attendanceTrend.map((point) => ({
    session_label: point.session_label,
    attendance_rate: point.attendance_rate,
  }));

  return (
    <ClassTabCollapsibleSection
      title="Class analytics"
      description={`Task grades, group grades, and attendance across sessions for ${className}.`}
      storageKey={COLLAPSIBLE_SECTION_STORAGE_KEYS.CLASS_DETAILS_ANALYTICS}
      collapsible={collapsible}
    >
      <div className="grid gap-6 px-4 pt-2 pb-3 @2xl/panel:grid-cols-2">
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
          title="Group grades per session"
          description={
            hasGroupGradeData
              ? `${analytics.groupGradeTrend.length} session${analytics.groupGradeTrend.length === 1 ? "" : "s"} with a group grade`
              : "Set group grade levels on sessions to see trends"
          }
        >
          <ClassLineChart
            data={groupGradeChartData}
            xKey="session_label"
            yDomain={[0, GROUP_GRADE_LEVEL_Y_TICKS.length - 1]}
            yTicks={GROUP_GRADE_LEVEL_Y_TICKS}
            yTickFormatter={formatGroupGradeLevelTick}
            yLabel="Level"
            emptyMessage={NO_GROUP_GRADES_MESSAGE}
            formatTooltipSeriesValue={(_value, _seriesKey, point) =>
              String(point.group_grade_label ?? "")
            }
            series={[
              {
                key: "group_grade_index",
                label: "Group grade",
                color: "#f59e0b",
              },
            ]}
          />
          <p className="mt-3 text-xs text-muted-foreground">
            Sessions without a group grade level are omitted. Levels run from
            Very low to Very high.
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
      </div>
    </ClassTabCollapsibleSection>
  );
}
