"use client";

import { GraduationCapIcon } from "lucide-react";
import { AnalyticsBarChart } from "@/components/manager/analytics/charts/analytics-bar-chart";
import { AnalyticsHistogramChart } from "@/components/manager/analytics/charts/analytics-histogram-chart";
import { AnalyticsPieChart } from "@/components/manager/analytics/charts/analytics-pie-chart";
import { AnalyticsStackedBarChart } from "@/components/manager/analytics/charts/analytics-stacked-bar-chart";
import { AnalyticsChartCard } from "@/components/manager/analytics/analytics-chart-card";
import { AnalyticsSection } from "@/components/manager/analytics/analytics-section";
import { ClassLineChart } from "@/components/manager/students/class-line-chart";
import { ANALYTICS_COLORS } from "@/lib/constants/manager-analytics-mock";
import { getAcademicAnalytics } from "@/lib/constants/manager-analytics-mock";
import { ROUTES } from "@/lib/constants/routes";
import type { AnalyticsFilters } from "@/types/manager-analytics";

type AcademicPerformanceSectionProps = {
  filters: AnalyticsFilters;
};

export function AcademicPerformanceSection({
  filters,
}: AcademicPerformanceSectionProps) {
  const data = getAcademicAnalytics(filters);

  return (
    <AnalyticsSection
      title="Academic performance"
      description="Grades, task completion, and grading efficiency across classes."
      icon={GraduationCapIcon}
      drillDownHref={ROUTES.MANAGER_SUBJECTS}
      drillDownLabel="View subjects"
    >
      {(open) => (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <AnalyticsChartCard
              title="Class average final grades"
              description={`School average: ${data.schoolAverage.toFixed(1)}%`}
            >
              <AnalyticsBarChart
                data={data.classAverages}
                referenceLine={data.schoolAverage}
                referenceLabel="Avg"
                yDomain={[0, 100]}
                valueFormatter={(v) => `${v.toFixed(1)}%`}
                visible={open}
              />
            </AnalyticsChartCard>

            <AnalyticsChartCard
              title="Grade distribution"
              description="Student count by grade range."
            >
              <AnalyticsHistogramChart
                data={data.gradeDistribution}
                passingThreshold={data.passingThreshold}
                visible={open}
              />
            </AnalyticsChartCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <AnalyticsChartCard
              title="Task completion by status"
              description="Pending, submitted, graded, late, and missing tasks."
            >
              <AnalyticsPieChart data={data.taskCompletion} visible={open} />
            </AnalyticsChartCard>

            <AnalyticsChartCard
              title="On-time vs late submissions"
              description="Weekly submission trends."
            >
              <ClassLineChart
                data={data.submissionTrend}
                xKey="label"
                series={[
                  {
                    key: "on_time",
                    label: "On time",
                    color: ANALYTICS_COLORS.emerald,
                  },
                  {
                    key: "late",
                    label: "Late",
                    color: ANALYTICS_COLORS.amber,
                  },
                ]}
                visible={open}
              />
            </AnalyticsChartCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <AnalyticsChartCard
              title="Grade component breakdown"
              description="Attendance, tasks, group work, and exam weights by class."
            >
              <AnalyticsStackedBarChart
                data={data.componentBreakdown}
                visible={open}
              />
            </AnalyticsChartCard>

            <AnalyticsChartCard
              title="Grading turnaround"
              description="Average days from submission to graded."
            >
              <AnalyticsBarChart
                data={data.gradingTurnaround}
                defaultColor={ANALYTICS_COLORS.violet}
                valueFormatter={(v) => `${v.toFixed(1)} days`}
                yDomain={[0, "auto"]}
                visible={open}
              />
            </AnalyticsChartCard>
          </div>
        </>
      )}
    </AnalyticsSection>
  );
}
