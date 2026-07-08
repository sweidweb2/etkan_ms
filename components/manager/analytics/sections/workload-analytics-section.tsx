"use client";

import { SchoolIcon } from "lucide-react";
import { AnalyticsBarChart } from "@/components/manager/analytics/charts/analytics-bar-chart";
import { AnalyticsPieChart } from "@/components/manager/analytics/charts/analytics-pie-chart";
import { AnalyticsChartCard } from "@/components/manager/analytics/analytics-chart-card";
import { AnalyticsSection } from "@/components/manager/analytics/analytics-section";
import { StudentDetailStatCard } from "@/components/manager/students/student-detail-stat-card";
import { ANALYTICS_COLORS } from "@/lib/constants/manager-analytics-mock";
import { getWorkloadAnalytics } from "@/lib/constants/manager-analytics-mock";
import { ROUTES } from "@/lib/constants/routes";
import type { AnalyticsFilters } from "@/types/manager-analytics";

type WorkloadAnalyticsSectionProps = {
  filters: AnalyticsFilters;
};

export function WorkloadAnalyticsSection({
  filters,
}: WorkloadAnalyticsSectionProps) {
  const data = getWorkloadAnalytics(filters);

  return (
    <AnalyticsSection
      title="Class & teacher workload"
      description="Class capacity, teacher assignments, and subject enrollment."
      icon={SchoolIcon}
      drillDownHref={ROUTES.MANAGER_CLASSES}
      drillDownLabel="View classes"
    >
      {(open) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {data.classStatusKpis.map((kpi) => (
              <StudentDetailStatCard
                key={kpi.label}
                label={kpi.label}
                value={kpi.value}
                accentClassName={kpi.accentClassName}
              />
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <AnalyticsChartCard
              title="Active vs inactive classes"
              description="Current class status breakdown."
            >
              <AnalyticsPieChart data={data.classStatus} visible={open} />
            </AnalyticsChartCard>

            <AnalyticsChartCard
              title="Enrollment per class"
              description="Fill rate based on a capacity of 25 students."
            >
              <AnalyticsBarChart
                data={data.enrollmentFillRate}
                yDomain={[0, 100]}
                valueFormatter={(v) => `${v}%`}
                referenceLine={80}
                referenceLabel="80%"
                colorAboveRef={ANALYTICS_COLORS.emerald}
                colorBelowRef={ANALYTICS_COLORS.amber}
                visible={open}
              />
            </AnalyticsChartCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <AnalyticsChartCard
              title="Classes per teacher"
              description="Teaching workload distribution."
            >
              <AnalyticsBarChart
                data={data.classesPerTeacher}
                layout="vertical"
                defaultColor={ANALYTICS_COLORS.sky}
                visible={open}
              />
            </AnalyticsChartCard>

            <AnalyticsChartCard
              title="Subject enrollments"
              description="Total enrollments by subject area."
            >
              <AnalyticsBarChart
                data={data.subjectEnrollments}
                defaultColor={ANALYTICS_COLORS.indigo}
                visible={open}
              />
            </AnalyticsChartCard>
          </div>
        </>
      )}
    </AnalyticsSection>
  );
}
