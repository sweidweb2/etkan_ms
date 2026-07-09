"use client";

import { AnalyticsBarChart } from "@/components/manager/analytics/charts/analytics-bar-chart";
import { AnalyticsPieChart } from "@/components/manager/analytics/charts/analytics-pie-chart";
import { AnalyticsChartCard } from "@/components/manager/analytics/analytics-chart-card";
import { AccountingAnalysisPaymentsTable } from "@/components/manager/accounting/accounting-analysis-payments-table";
import { ClassLineChart } from "@/components/manager/students/class-line-chart";
import { StudentDetailStatCard } from "@/components/manager/students/student-detail-stat-card";
import { ANALYTICS_COLORS } from "@/lib/constants/manager-analytics-mock";
import { formatAccountCurrency } from "@/lib/constants/manager-subscribed-semester-display";
import type { AccountingAnalysisSemesterAnalytics } from "@/types/manager-accounting-analytics";

type AccountingAnalysisSemesterPanelProps = {
  analytics: AccountingAnalysisSemesterAnalytics;
};

export function AccountingAnalysisSemesterPanel({
  analytics,
}: AccountingAnalysisSemesterPanelProps) {
  const { summary } = analytics;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <StudentDetailStatCard
          label="Students enrolled"
          value={summary.studentCount}
          accentClassName="border-l-sky-500"
        />
        <StudentDetailStatCard
          label="Total expected"
          value={formatAccountCurrency(summary.totalExpected)}
          accentClassName="border-l-violet-500"
        />
        <StudentDetailStatCard
          label="Total paid"
          value={formatAccountCurrency(summary.totalPaid)}
          accentClassName="border-l-emerald-500"
        />
        <StudentDetailStatCard
          label="Total due"
          value={formatAccountCurrency(summary.totalDue)}
          accentClassName="border-l-amber-500"
        />
        <StudentDetailStatCard
          label="Collection rate"
          value={`${summary.collectionRate}%`}
          accentClassName="border-l-indigo-500"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StudentDetailStatCard
          label="Active subscriptions"
          value={summary.activeSubscriptions}
          accentClassName="border-l-emerald-500"
        />
        <StudentDetailStatCard
          label="Overdue subscriptions"
          value={summary.overdueCount}
          accentClassName="border-l-rose-500"
        />
        <StudentDetailStatCard
          label="Reminders due"
          value={summary.scheduledRemindersDue}
          accentClassName="border-l-orange-500"
        />
        <StudentDetailStatCard
          label="Average payment"
          value={formatAccountCurrency(summary.averagePaymentSize)}
          accentClassName="border-l-sky-500"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsChartCard
          title="Revenue trend"
          description="Payment totals over the selected period."
        >
          <ClassLineChart
            data={analytics.revenueTrend}
            xKey="label"
            series={[
              {
                key: "revenue",
                label: "Revenue",
                color: ANALYTICS_COLORS.violet,
              },
            ]}
            yLabel="USD"
          />
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title="Expected vs collected"
          description="Cumulative subscribed amount compared to payments received."
        >
          <ClassLineChart
            data={analytics.expectedVsPaidTrend}
            xKey="label"
            series={[
              {
                key: "expected",
                label: "Expected",
                color: ANALYTICS_COLORS.amber,
              },
              {
                key: "collected",
                label: "Collected",
                color: ANALYTICS_COLORS.emerald,
              },
            ]}
            yLabel="USD"
          />
        </AnalyticsChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsChartCard
          title="Revenue by payment method"
          description="Breakdown of collected payments."
        >
          <AnalyticsPieChart data={analytics.revenueByMethod} />
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title="Subscription status"
          description="Billing status across enrolled students."
        >
          <AnalyticsBarChart
            data={analytics.subscriptionStatusBreakdown}
            defaultColor={ANALYTICS_COLORS.indigo}
          />
        </AnalyticsChartCard>
      </div>

      <AccountingAnalysisPaymentsTable payments={analytics.payments} />
    </div>
  );
}
