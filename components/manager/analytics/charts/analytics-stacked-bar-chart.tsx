"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { ANALYTICS_COLORS } from "@/lib/constants/manager-analytics-mock";
import { AnalyticsChartPlaceholder } from "@/components/manager/analytics/analytics-chart-placeholder";
import type { AnalyticsStackedBarPoint } from "@/types/manager-analytics";

const STACK_KEYS = [
  { key: "attendance", label: "Attendance", color: ANALYTICS_COLORS.emerald },
  { key: "tasks", label: "Tasks", color: ANALYTICS_COLORS.sky },
  { key: "group", label: "Group", color: ANALYTICS_COLORS.violet },
  { key: "exam", label: "Exam", color: ANALYTICS_COLORS.amber },
] as const;

type AnalyticsStackedBarChartProps = {
  data: AnalyticsStackedBarPoint[];
  className?: string;
  heightClassName?: string;
  visible?: boolean;
};

export function AnalyticsStackedBarChart({
  data,
  className,
  heightClassName = "h-72",
  visible = true,
}: AnalyticsStackedBarChartProps) {
  if (!visible) {
    return <AnalyticsChartPlaceholder className={heightClassName} />;
  }

  if (data.length === 0) {
    return (
      <div
        className={cn(
          "flex w-full items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground",
          heightClassName,
          className
        )}
      >
        No data for this period.
      </div>
    );
  }

  const angle = data.length > 4 ? -25 : 0;

  return (
    <div className={cn("w-full", heightClassName, className)}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 12, left: 0, bottom: angle ? 48 : 8 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            angle={angle}
            textAnchor={angle ? "end" : "middle"}
            interval={0}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "0.5rem",
              border: "1px solid hsl(var(--border))",
              background: "hsl(var(--popover))",
              color: "hsl(var(--popover-foreground))",
              fontSize: "12px",
            }}
          />
          <Legend wrapperStyle={{ fontSize: "12px" }} />
          {STACK_KEYS.map((item) => (
            <Bar
              key={item.key}
              dataKey={item.key}
              name={item.label}
              stackId="grade"
              fill={item.color}
              radius={[0, 0, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
