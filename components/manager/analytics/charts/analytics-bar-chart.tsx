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

type AnalyticsBarChartProps = {
  data: AnalyticsBarPoint[];
  className?: string;
  heightClassName?: string;
  referenceLine?: number;
  referenceLabel?: string;
  layout?: "vertical" | "horizontal";
  valueFormatter?: (value: number) => string;
  colorAboveRef?: string;
  colorBelowRef?: string;
  defaultColor?: string;
  yDomain?: [number | string, number | string];
  visible?: boolean;
};

function BarTooltip({
  active,
  payload,
  valueFormatter,
}: {
  active?: boolean;
  payload?: Array<{ payload: AnalyticsBarPoint }>;
  valueFormatter?: (value: number) => string;
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const item = payload[0].payload;
  const formatted = valueFormatter
    ? valueFormatter(item.value)
    : item.value.toLocaleString();

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-popover-foreground shadow-md">
      <p className="text-sm font-medium">{item.label}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Value:{" "}
        <span className="font-semibold text-foreground tabular-nums">
          {formatted}
        </span>
      </p>
    </div>
  );
}

export function AnalyticsBarChart({
  data,
  className,
  heightClassName = "h-72",
  referenceLine,
  referenceLabel,
  layout = "horizontal",
  valueFormatter,
  colorAboveRef = ANALYTICS_COLORS.sky,
  colorBelowRef = ANALYTICS_COLORS.skyMuted,
  defaultColor = ANALYTICS_COLORS.sky,
  yDomain,
  visible = true,
}: AnalyticsBarChartProps) {
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

  const isVertical = layout === "vertical";
  const angle = data.length > 4 ? -25 : 0;

  return (
    <div className={cn("w-full", heightClassName, className)}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout={isVertical ? "vertical" : "horizontal"}
          margin={
            isVertical
              ? { top: 8, right: 24, left: 80, bottom: 8 }
              : { top: 8, right: 12, left: 0, bottom: angle ? 48 : 8 }
          }
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            vertical={!isVertical}
            horizontal={isVertical}
          />
          {isVertical ? (
            <>
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                domain={yDomain}
              />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                width={76}
              />
            </>
          ) : (
            <>
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
                domain={yDomain}
              />
            </>
          )}
          <Tooltip
            content={<BarTooltip valueFormatter={valueFormatter} />}
          />
          {referenceLine !== undefined ? (
            <ReferenceLine
              {...(isVertical
                ? { x: referenceLine }
                : { y: referenceLine })}
              stroke={ANALYTICS_COLORS.amber}
              strokeDasharray="4 4"
              label={
                referenceLabel
                  ? {
                      value: referenceLabel,
                      position: isVertical ? "top" : "right",
                      fontSize: 11,
                      fill: "var(--muted-foreground)",
                    }
                  : undefined
              }
            />
          ) : null}
          <Bar
            dataKey="value"
            radius={isVertical ? [0, 4, 4, 0] : [4, 4, 0, 0]}
            maxBarSize={isVertical ? 28 : 48}
          >
            {data.map((entry) => (
              <Cell
                key={entry.label}
                fill={
                  entry.color ??
                  (referenceLine !== undefined
                    ? entry.value >= referenceLine
                      ? colorAboveRef
                      : colorBelowRef
                    : defaultColor)
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
