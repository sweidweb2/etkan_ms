"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

type ClassLineChartSeries = {
  key: string;
  label: string;
  color: string;
};

type ClassLineChartProps = {
  data: Array<Record<string, string | number | null>>;
  series: ClassLineChartSeries[];
  xKey: string;
  className?: string;
  yDomain?: [number, number];
  yLabel?: string;
  visible?: boolean;
  emptyMessage?: string;
  getTooltipExtraLines?: (
    point: Record<string, string | number | null>
  ) => string[];
};

export function hasPlottableSeriesValues(
  data: Array<Record<string, string | number | null>>,
  seriesKeys: string[]
) {
  return data.some((point) =>
    seriesKeys.some((key) => {
      const value = point[key];
      return value !== null && value !== undefined && value !== "";
    })
  );
}

export function ClassLineChart({
  data,
  series,
  xKey,
  className,
  yDomain,
  yLabel,
  visible = true,
  emptyMessage = "No chart data yet.",
  getTooltipExtraLines,
}: ClassLineChartProps) {
  if (!visible) {
    return (
      <div
        className={cn(
          "h-[18rem] w-full rounded-lg bg-muted/20",
          className
        )}
      />
    );
  }

  const seriesKeys = series.map((item) => item.key);
  const hasPlottableValues = hasPlottableSeriesValues(data, seriesKeys);

  if (data.length === 0 || !hasPlottableValues) {
    return (
      <div
        className={cn(
          "flex h-[18rem] w-full min-w-0 items-center justify-center rounded-lg border border-dashed px-4 text-center text-sm text-muted-foreground",
          className
        )}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn("h-[18rem] w-full min-w-0", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 8, right: 12, left: 4, bottom: 8 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            vertical={false}
          />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            domain={yDomain}
            width={yLabel ? 48 : 36}
            label={
              yLabel
                ? {
                    value: yLabel,
                    angle: -90,
                    position: "insideLeft",
                    style: {
                      fontSize: 11,
                      fill: "var(--muted-foreground)",
                    },
                  }
                : undefined
            }
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) {
                return null;
              }

              const point = payload[0]?.payload as
                | Record<string, string | number | null>
                | undefined;

              if (!point) {
                return null;
              }

              const extraLines = getTooltipExtraLines?.(point) ?? [];

              return (
                <div
                  className="rounded-lg border px-3 py-2 text-xs shadow-sm"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--popover)",
                    color: "var(--popover-foreground)",
                  }}
                >
                  <p className="font-medium">{label}</p>
                  {payload.map((entry) =>
                    entry.value == null ? null : (
                      <p key={entry.dataKey} className="mt-1">
                        {entry.name}: {entry.value}
                        {yDomain?.[1] === 100 ? "%" : ""}
                      </p>
                    )
                  )}
                  {extraLines.map((line) => (
                    <p key={line} className="mt-1 text-muted-foreground">
                      {line}
                    </p>
                  ))}
                </div>
              );
            }}
          />
          {series.length > 1 ? <Legend wrapperStyle={{ fontSize: "12px" }} /> : null}
          {series.map((item) => (
            <Line
              key={item.key}
              type="monotone"
              dataKey={item.key}
              name={item.label}
              stroke={item.color}
              strokeWidth={2}
              dot={{ r: 3, fill: item.color, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
