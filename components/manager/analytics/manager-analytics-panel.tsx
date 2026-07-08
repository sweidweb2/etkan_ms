"use client";

import { useMemo, useState } from "react";
import { AnalyticsFilterBar } from "@/components/manager/analytics/analytics-filter-bar";
import { AcademicPerformanceSection } from "@/components/manager/analytics/sections/academic-performance-section";
import { ActivityPulseSection } from "@/components/manager/analytics/sections/activity-pulse-section";
import { EnrollmentAnalyticsSection } from "@/components/manager/analytics/sections/enrollment-analytics-section";
import { EquipmentAnalyticsSection } from "@/components/manager/analytics/sections/equipment-analytics-section";
import { FinancialAnalyticsSection } from "@/components/manager/analytics/sections/financial-analytics-section";
import { WorkloadAnalyticsSection } from "@/components/manager/analytics/sections/workload-analytics-section";
import { StudentDetailStatCard } from "@/components/manager/students/student-detail-stat-card";
import { getAnalyticsHeadlineKpis } from "@/lib/constants/manager-analytics-mock";
import type { AnalyticsFilters, AnalyticsPeriod } from "@/types/manager-analytics";

const INITIAL_FILTERS: AnalyticsFilters = {
  period: "30d",
  semesterId: "all",
};

export function ManagerAnalyticsPanel() {
  const [filters, setFilters] = useState<AnalyticsFilters>(INITIAL_FILTERS);

  const headlineKpis = useMemo(
    () => getAnalyticsHeadlineKpis(filters),
    [filters]
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Interactive dashboards for enrollment, academics, workload, finances,
          equipment, and system activity.
        </p>
      </div>

      <AnalyticsFilterBar
        filters={filters}
        onPeriodChange={(period: AnalyticsPeriod) =>
          setFilters((current) => ({ ...current, period }))
        }
        onSemesterChange={(semesterId) =>
          setFilters((current) => ({ ...current, semesterId }))
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {headlineKpis.map((kpi) => (
          <StudentDetailStatCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            accentClassName={kpi.accentClassName}
          />
        ))}
      </div>

      <EnrollmentAnalyticsSection filters={filters} />
      <AcademicPerformanceSection filters={filters} />
      <WorkloadAnalyticsSection filters={filters} />
      <FinancialAnalyticsSection filters={filters} />
      <EquipmentAnalyticsSection filters={filters} />
      <ActivityPulseSection filters={filters} />
    </div>
  );
}
