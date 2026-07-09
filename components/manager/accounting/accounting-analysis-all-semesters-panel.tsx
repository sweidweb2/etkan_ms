"use client";

import { AnalyticsBarChart } from "@/components/manager/analytics/charts/analytics-bar-chart";
import { AnalyticsSparkline } from "@/components/manager/analytics/charts/analytics-sparkline";
import { AnalyticsChartCard } from "@/components/manager/analytics/analytics-chart-card";
import { AccountingAnalysisPaymentsTable } from "@/components/manager/accounting/accounting-analysis-payments-table";
import { ClassLineChart } from "@/components/manager/students/class-line-chart";
import { StudentDetailStatCard } from "@/components/manager/students/student-detail-stat-card";
import { ANALYTICS_COLORS } from "@/lib/constants/manager-analytics-mock";
import { formatAccountCurrency } from "@/lib/constants/manager-subscribed-semester-display";
import type {
  AccountingAnalysisAllSemestersAnalytics,
  AccountingAnalysisSemesterOption,
} from "@/types/manager-accounting-analytics";

type AccountingAnalysisAllSemestersPanelProps = {
  analytics: AccountingAnalysisAllSemestersAnalytics;
  semesterOptions: AccountingAnalysisSemesterOption[];
};

export function AccountingAnalysisAllSemestersPanel({
  analytics,
  semesterOptions,
}: AccountingAnalysisAllSemestersPanelProps) {
  const { summary } = analytics;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <StudentDetailStatCard
          label="Students enrolled"
          value={summary.uniqueStudentCount}
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
        <div className="rounded-xl border-l-4 border-l-indigo-500 bg-card py-4 pr-5 pl-4 ring-1 ring-foreground/10">
          <p className="text-sm text-muted-foreground">Collection rate</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
            {summary.collectionRate}%
          </p>
          <div className="mt-3">
            <AnalyticsSparkline
              data={analytics.collectionSparkline}
              dataKey="rate"
              color={ANALYTICS_COLORS.indigo}
            />
          </div>
        </div>
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
          description="Aggregate payment totals across all semesters."
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
          title="Outstanding balance trend"
          description="Unpaid balance across all subscriptions over time."
        >
          <ClassLineChart
            data={analytics.outstandingTrend}
            xKey="label"
            series={[
              {
                key: "balance",
                label: "Balance",
                color: ANALYTICS_COLORS.amber,
              },
            ]}
            yLabel="USD"
          />
        </AnalyticsChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsChartCard
          title="Semester comparison"
          description="Expected vs collected amount by semester."
        >
          <ClassLineChart
            data={analytics.semesterComparison}
            xKey="label"
            series={[
              {
                key: "expected",
                label: "Expected",
                color: ANALYTICS_COLORS.amber,
              },
              {
                key: "paid",
                label: "Paid",
                color: ANALYTICS_COLORS.emerald,
              },
            ]}
            yLabel="USD"
          />
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title="Students per semester"
          description="Enrollment count by academic term."
        >
          <AnalyticsBarChart
            data={analytics.subscriptionsPerSemester}
            defaultColor={ANALYTICS_COLORS.emerald}
          />
        </AnalyticsChartCard>
      </div>

      <AccountingAnalysisPaymentsTable
        payments={analytics.payments}
        showSemesterFilter
        semesterOptions={semesterOptions}
      />
    </div>
  );
}
