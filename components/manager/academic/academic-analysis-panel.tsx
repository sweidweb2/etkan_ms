"use client";

import {
  BookOpenIcon,
  UserCheckIcon,
  UserXIcon,
  UsersIcon,
} from "lucide-react";
import { AcademicClassSessionProgressBars } from "@/components/manager/academic/academic-class-session-progress-bars";
import { AnalyticsStatCard } from "@/components/manager/accounting/analytics-stat-card";
import { AnalyticsChartCard } from "@/components/manager/analytics/analytics-chart-card";
import { PanelPageHeader } from "@/components/panels/panel-page-header";
import type { ManagerAcademicAnalysisData } from "@/types/manager-academic-analysis";

type AcademicAnalysisPanelProps = {
  data: ManagerAcademicAnalysisData;
};

export function AcademicAnalysisPanel({ data }: AcademicAnalysisPanelProps) {
  return (
    <div className="flex flex-col gap-6">
      <PanelPageHeader title="Academic analysis" />

      <div className="grid gap-4 @lg/panel:grid-cols-2 @2xl/panel:grid-cols-4">
        <AnalyticsStatCard
          label="Classes"
          value={String(data.classCount)}
          description="All classes in the catalog"
          icon={BookOpenIcon}
          iconClassName="text-sky-600 dark:text-sky-400"
        />
        <AnalyticsStatCard
          label="Active students"
          value={String(data.studentCounts.active)}
          description="Students marked active"
          icon={UserCheckIcon}
          iconClassName="text-emerald-600 dark:text-emerald-400"
        />
        <AnalyticsStatCard
          label="Inactive students"
          value={String(data.studentCounts.inactive)}
          description="Students marked inactive"
          icon={UserXIcon}
          iconClassName="text-amber-600 dark:text-amber-400"
        />
        <AnalyticsStatCard
          label="Total students"
          value={String(data.studentCounts.total)}
          description="All student profiles"
          icon={UsersIcon}
          iconClassName="text-violet-600 dark:text-violet-400"
        />
      </div>

      <AnalyticsChartCard
        title="Class session progress"
        description="Per-class bars: sessions completed versus the subject planned count."
      >
        <AcademicClassSessionProgressBars classes={data.classSessionSeries} />
      </AnalyticsChartCard>
    </div>
  );
}
