"use client";

import { CalculatorIcon } from "lucide-react";
import { AnalyticsBarChart } from "@/components/manager/analytics/charts/analytics-bar-chart";
import { AnalyticsPieChart } from "@/components/manager/analytics/charts/analytics-pie-chart";
import { AnalyticsSparkline } from "@/components/manager/analytics/charts/analytics-sparkline";
import { AnalyticsChartCard } from "@/components/manager/analytics/analytics-chart-card";
import { AnalyticsSection } from "@/components/manager/analytics/analytics-section";
import { ClassLineChart } from "@/components/manager/students/class-line-chart";
import { StudentDetailStatCard } from "@/components/manager/students/student-detail-stat-card";
import { ANALYTICS_COLORS } from "@/lib/constants/manager-analytics-mock";
import { getFinancialAnalytics } from "@/lib/constants/manager-analytics-mock";
import type { AnalyticsFilters } from "@/types/manager-analytics";

type FinancialAnalyticsSectionProps = {
  filters: AnalyticsFilters;
};

export function FinancialAnalyticsSection({
  filters,
}: FinancialAnalyticsSectionProps) {
  const data = getFinancialAnalytics(filters);

  return (
    <AnalyticsSection
      title="Financial overview"
      description="Revenue trends, collection rates, and subscription activity."
      icon={CalculatorIcon}
    >
      {(open) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border-l-4 border-l-emerald-500 bg-card py-4 pr-5 pl-4 ring-1 ring-foreground/10 sm:col-span-1">
              <p className="text-sm text-muted-foreground">Collection rate</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
                {data.collectionRate}%
              </p>
              <div className="mt-3">
                <AnalyticsSparkline
                  data={data.collectionSparkline}
                  visible={open}
                />
              </div>
            </div>
            <StudentDetailStatCard
              label="Active subscriptions"
              value={data.subscriptionsPerSemester.reduce(
                (sum, item) => sum + item.value,
                0
              )}
              accentClassName="border-l-violet-500"
            />
            <StudentDetailStatCard
              label="Outstanding balance"
              value={`$${data.outstandingTrend.at(-1)?.balance?.toLocaleString() ?? "0"}`}
              accentClassName="border-l-amber-500"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <AnalyticsChartCard
              title="Revenue trend"
              description="Weekly payment totals."
            >
              <ClassLineChart
                data={data.revenueTrend}
                xKey="label"
                series={[
                  {
                    key: "revenue",
                    label: "Revenue",
                    color: ANALYTICS_COLORS.violet,
                  },
                ]}
                yLabel="USD"
                visible={open}
              />
            </AnalyticsChartCard>

            <AnalyticsChartCard
              title="Outstanding balance trend"
              description="Aggregate unpaid balance over time."
            >
              <ClassLineChart
                data={data.outstandingTrend}
                xKey="label"
                series={[
                  {
                    key: "balance",
                    label: "Balance",
                    color: ANALYTICS_COLORS.amber,
                  },
                ]}
                yLabel="USD"
                visible={open}
              />
            </AnalyticsChartCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <AnalyticsChartCard
              title="Revenue by method"
              description="Payment method breakdown."
            >
              <AnalyticsPieChart data={data.revenueByMethod} visible={open} />
            </AnalyticsChartCard>

            <AnalyticsChartCard
              title="Revenue by currency"
              description="Totals per currency."
            >
              <AnalyticsBarChart
                data={data.revenueByCurrency}
                defaultColor={ANALYTICS_COLORS.sky}
                valueFormatter={(v) => `$${v.toLocaleString()}`}
                visible={open}
              />
            </AnalyticsChartCard>

            <AnalyticsChartCard
              title="Active subscriptions per semester"
              description="Subscription count by academic term."
            >
              <AnalyticsBarChart
                data={data.subscriptionsPerSemester}
                defaultColor={ANALYTICS_COLORS.emerald}
                visible={open}
              />
            </AnalyticsChartCard>
          </div>
        </>
      )}
    </AnalyticsSection>
  );
}
