"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { ANALYTICS_COLORS } from "@/lib/constants/manager-analytics-mock";
import { AnalyticsChartPlaceholder } from "@/components/manager/analytics/analytics-chart-placeholder";
import type { AnalyticsBarPoint } from "@/types/manager-analytics";

type AnalyticsHistogramChartProps = {
  data: AnalyticsBarPoint[];
  passingThreshold?: number;
  className?: string;
  heightClassName?: string;
  visible?: boolean;
};

function getPassingBinIndex(
  data: AnalyticsBarPoint[],
  threshold: number
): number {
  return data.findIndex((bin) => {
    const start = Number.parseInt(bin.label, 10);
    return !Number.isNaN(start) && start >= threshold;
  });
}

export function AnalyticsHistogramChart({
  data,
  passingThreshold,
  className,
  heightClassName = "h-72",
  visible = true,
}: AnalyticsHistogramChartProps) {
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

  const passingBinIndex =
    passingThreshold !== undefined
      ? getPassingBinIndex(data, passingThreshold)
      : -1;

  return (
    <div className={cn("w-full", heightClassName, className)}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 12, left: 0, bottom: 8 }}
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
          {passingBinIndex >= 0 ? (
            <ReferenceLine
              x={data[passingBinIndex]?.label}
              stroke={ANALYTICS_COLORS.amber}
              strokeDasharray="4 4"
              label={{
                value: `Pass (${passingThreshold})`,
                position: "top",
                fontSize: 11,
                fill: "var(--muted-foreground)",
              }}
            />
          ) : null}
          <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={56}>
            {data.map((entry, index) => (
              <Cell
                key={entry.label}
                fill={
                  passingBinIndex >= 0 && index >= passingBinIndex
                    ? ANALYTICS_COLORS.emerald
                    : ANALYTICS_COLORS.skyMuted
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
