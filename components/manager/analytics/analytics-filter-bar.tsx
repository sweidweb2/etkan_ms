"use client";

import { MANAGER_PHASES_MOCK } from "@/lib/constants/manager-phases-mock";
import { ANALYTICS_PERIOD_OPTIONS } from "@/lib/constants/manager-analytics-mock";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AnalyticsFilters, AnalyticsPeriod } from "@/types/manager-analytics";

type AnalyticsFilterBarProps = {
  filters: AnalyticsFilters;
  onPeriodChange: (period: AnalyticsPeriod) => void;
  onSemesterChange: (semesterId: string | "all") => void;
};

export function AnalyticsFilterBar({
  filters,
  onPeriodChange,
  onSemesterChange,
}: AnalyticsFilterBarProps) {
  return (
    <Card className="py-0">
      <CardHeader className="border-b bg-muted/40 py-4">
        <CardTitle className="text-base">Filters</CardTitle>
        <CardDescription>
          Adjust the period and semester to explore trends across the school.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center">
        <Select
          value={filters.period}
          onValueChange={(value) => onPeriodChange(value as AnalyticsPeriod)}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent>
            {ANALYTICS_PERIOD_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.semesterId}
          onValueChange={(value) =>
            onSemesterChange(value ?? "all")
          }
        >
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="Semester" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All semesters</SelectItem>
            {MANAGER_PHASES_MOCK.map((semester) => (
              <SelectItem key={semester.id} value={semester.id}>
                {semester.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}
