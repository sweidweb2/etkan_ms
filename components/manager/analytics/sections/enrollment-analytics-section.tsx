"use client";

import { UsersIcon } from "lucide-react";
import { AnalyticsBarChart } from "@/components/manager/analytics/charts/analytics-bar-chart";
import { AnalyticsPieChart } from "@/components/manager/analytics/charts/analytics-pie-chart";
import { AnalyticsChartCard } from "@/components/manager/analytics/analytics-chart-card";
import { AnalyticsSection } from "@/components/manager/analytics/analytics-section";
import { ClassLineChart } from "@/components/manager/students/class-line-chart";
import { StudentDetailStatCard } from "@/components/manager/students/student-detail-stat-card";
import { ANALYTICS_COLORS } from "@/lib/constants/manager-analytics-mock";
import { getEnrollmentAnalytics } from "@/lib/constants/manager-analytics-mock";
import { ROUTES } from "@/lib/constants/routes";
import type { AnalyticsFilters } from "@/types/manager-analytics";

type EnrollmentAnalyticsSectionProps = {
  filters: AnalyticsFilters;
};

export function EnrollmentAnalyticsSection({
  filters,
}: EnrollmentAnalyticsSectionProps) {
  const data = getEnrollmentAnalytics(filters);

  return (
    <AnalyticsSection
      title="Enrollment & population"
      description="Student status, enrollment trends, and demographic breakdowns."
      icon={UsersIcon}
      drillDownHref={ROUTES.MANAGER_STUDENTS}
      drillDownLabel="View students"
    >
      {(open) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {data.studentStatusKpis.map((kpi) => (
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
              title="Student status"
              description="Active, inactive, graduated, and suspended counts."
            >
              <AnalyticsPieChart data={data.studentStatus} visible={open} />
            </AnalyticsChartCard>

            <AnalyticsChartCard
              title="New enrollments over time"
              description="Monthly new student registrations."
            >
              <ClassLineChart
                data={data.enrollmentTrend}
                xKey="label"
                series={[
                  {
                    key: "count",
                    label: "Enrollments",
                    color: ANALYTICS_COLORS.sky,
                  },
                ]}
                yLabel="Students"
                visible={open}
              />
            </AnalyticsChartCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <AnalyticsChartCard
              title="Enrollment status"
              description="Class enrollments by progress status."
            >
              <AnalyticsBarChart
                data={data.enrollmentStatus}
                defaultColor={ANALYTICS_COLORS.violet}
                visible={open}
              />
            </AnalyticsChartCard>

            <AnalyticsChartCard
              title="Classes per student"
              description="How many classes each student is enrolled in."
            >
              <AnalyticsBarChart
                data={data.classesPerStudent}
                defaultColor={ANALYTICS_COLORS.emerald}
                visible={open}
              />
            </AnalyticsChartCard>
          </div>

          <AnalyticsChartCard
            title="Age cohorts"
            description="Student distribution by age group."
            className="lg:max-w-xl"
          >
            <AnalyticsBarChart
              data={data.ageCohorts}
              defaultColor={ANALYTICS_COLORS.indigo}
              visible={open}
            />
          </AnalyticsChartCard>
        </>
      )}
    </AnalyticsSection>
  );
}
