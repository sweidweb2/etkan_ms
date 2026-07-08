"use client";

import { ActivityIcon } from "lucide-react";
import { AnalyticsBarChart } from "@/components/manager/analytics/charts/analytics-bar-chart";
import { AnalyticsChartCard } from "@/components/manager/analytics/analytics-chart-card";
import { AnalyticsSection } from "@/components/manager/analytics/analytics-section";
import { ClassLineChart } from "@/components/manager/students/class-line-chart";
import { ANALYTICS_COLORS } from "@/lib/constants/manager-analytics-mock";
import { getActivityAnalytics } from "@/lib/constants/manager-analytics-mock";
import { ROUTES } from "@/lib/constants/routes";
import type { AnalyticsFilters } from "@/types/manager-analytics";

type ActivityPulseSectionProps = {
  filters: AnalyticsFilters;
};

export function ActivityPulseSection({ filters }: ActivityPulseSectionProps) {
  const data = getActivityAnalytics(filters);

  return (
    <AnalyticsSection
      title="Activity pulse"
      description="System activity volume, active users, and modified tables."
      icon={ActivityIcon}
      footerNote="Full audit trail will be available in Reports."
      drillDownHref={ROUTES.MANAGER_REPORTS}
      drillDownLabel="Go to reports"
    >
      {(open) => (
        <>
          <AnalyticsChartCard
            title="System activity volume"
            description="Audit events over the selected period."
          >
            <ClassLineChart
              data={data.activityTrend}
              xKey="label"
              series={[
                {
                  key: "events",
                  label: "Events",
                  color: ANALYTICS_COLORS.sky,
                },
              ]}
              visible={open}
            />
          </AnalyticsChartCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <AnalyticsChartCard
              title="Most active users"
              description="Top users by audit log events."
            >
              <AnalyticsBarChart
                data={data.mostActiveUsers}
                layout="vertical"
                defaultColor={ANALYTICS_COLORS.emerald}
                visible={open}
              />
            </AnalyticsChartCard>

            <AnalyticsChartCard
              title="Most modified tables"
              description="Tables with the highest change volume."
            >
              <AnalyticsBarChart
                data={data.mostModifiedTables}
                layout="vertical"
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
