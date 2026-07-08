"use client";

import { WrenchIcon } from "lucide-react";
import { AnalyticsBarChart } from "@/components/manager/analytics/charts/analytics-bar-chart";
import { AnalyticsChartCard } from "@/components/manager/analytics/analytics-chart-card";
import { AnalyticsSection } from "@/components/manager/analytics/analytics-section";
import { ClassLineChart } from "@/components/manager/students/class-line-chart";
import { StudentDetailStatCard } from "@/components/manager/students/student-detail-stat-card";
import { ANALYTICS_COLORS } from "@/lib/constants/manager-analytics-mock";
import { getEquipmentAnalytics } from "@/lib/constants/manager-analytics-mock";
import { ROUTES } from "@/lib/constants/routes";
import type { AnalyticsFilters } from "@/types/manager-analytics";

type EquipmentAnalyticsSectionProps = {
  filters: AnalyticsFilters;
};

export function EquipmentAnalyticsSection({
  filters,
}: EquipmentAnalyticsSectionProps) {
  const data = getEquipmentAnalytics(filters);

  return (
    <AnalyticsSection
      title="Equipment utilization"
      description="Borrow activity, inventory value, and low-stock alerts."
      icon={WrenchIcon}
      drillDownHref={ROUTES.MANAGER_EQUIPMENTS}
      drillDownLabel="View equipment"
    >
      {(open) => (
        <>
          <StudentDetailStatCard
            label="Inventory value"
            value={`$${data.inventoryValue.toLocaleString()}`}
            accentClassName="border-l-sky-500"
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <AnalyticsChartCard
              title="Open borrows vs returned"
              description="Weekly borrow and return activity."
            >
              <ClassLineChart
                data={data.borrowTrend}
                xKey="label"
                series={[
                  {
                    key: "open",
                    label: "Open",
                    color: ANALYTICS_COLORS.amber,
                  },
                  {
                    key: "returned",
                    label: "Returned",
                    color: ANALYTICS_COLORS.emerald,
                  },
                ]}
                visible={open}
              />
            </AnalyticsChartCard>

            <AnalyticsChartCard
              title="Most borrowed items"
              description="Top equipment by borrow count."
            >
              <AnalyticsBarChart
                data={data.mostBorrowed}
                layout="vertical"
                defaultColor={ANALYTICS_COLORS.violet}
                visible={open}
              />
            </AnalyticsChartCard>
          </div>

          {data.lowStock.length > 0 ? (
            <div className="rounded-xl border p-4">
              <h3 className="text-sm font-medium">Low-stock alerts</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Items at or below the restock threshold (5 units).
              </p>
              <ul className="mt-3 divide-y">
                {data.lowStock.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between py-2.5 text-sm"
                  >
                    <span>{item.name}</span>
                    <span className="tabular-nums text-rose-600">
                      {item.quantity} / {item.threshold}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}
    </AnalyticsSection>
  );
}
