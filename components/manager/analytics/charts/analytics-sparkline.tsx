"use client";

import { Line, LineChart, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { ANALYTICS_COLORS } from "@/lib/constants/manager-analytics-mock";
import { AnalyticsChartPlaceholder } from "@/components/manager/analytics/analytics-chart-placeholder";
import type { AnalyticsTimePoint } from "@/types/manager-analytics";

type AnalyticsSparklineProps = {
  data: AnalyticsTimePoint[];
  dataKey?: string;
  color?: string;
  className?: string;
  visible?: boolean;
};

export function AnalyticsSparkline({
  data,
  dataKey = "rate",
  color = ANALYTICS_COLORS.emerald,
  className,
  visible = true,
}: AnalyticsSparklineProps) {
  if (!visible) {
    return <AnalyticsChartPlaceholder className={cn("h-10", className)} />;
  }

  if (data.length === 0) {
    return (
      <div
        className={cn(
          "h-10 w-full rounded border border-dashed bg-muted/20",
          className
        )}
      />
    );
  }

  return (
    <div className={cn("h-10 w-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
