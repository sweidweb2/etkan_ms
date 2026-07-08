"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { cn } from "@/lib/utils";
import { AnalyticsChartPlaceholder } from "@/components/manager/analytics/analytics-chart-placeholder";
import type { AnalyticsPieSlice } from "@/types/manager-analytics";

type AnalyticsPieChartProps = {
  data: AnalyticsPieSlice[];
  className?: string;
  heightClassName?: string;
  visible?: boolean;
};

function PieTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: AnalyticsPieSlice }>;
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const item = payload[0].payload;

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-popover-foreground shadow-md">
      <p className="text-sm font-medium">{item.label}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Count:{" "}
        <span className="font-semibold text-foreground tabular-nums">
          {item.value}
        </span>
      </p>
    </div>
  );
}

export function AnalyticsPieChart({
  data,
  className,
  heightClassName = "min-h-[14rem]",
  visible = true,
}: AnalyticsPieChartProps) {
  if (!visible) {
    return <AnalyticsChartPlaceholder className={heightClassName} />;
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
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

  return (
    <div className={cn("w-full", heightClassName, className)}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="45%"
            innerRadius={48}
            outerRadius={72}
            paddingAngle={2}
          >
            {data.map((entry) => (
              <Cell key={entry.label} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<PieTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: "12px" }}
            verticalAlign="bottom"
            iconType="circle"
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
