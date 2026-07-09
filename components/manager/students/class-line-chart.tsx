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
  data: Array<Record<string, string | number>>;
  series: ClassLineChartSeries[];
  xKey: string;
  className?: string;
  yDomain?: [number, number];
  yLabel?: string;
  visible?: boolean;
};

export function ClassLineChart({
  data,
  series,
  xKey,
  className,
  yDomain,
  yLabel,
  visible = true,
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

  if (data.length === 0) {
    return (
      <div
        className={cn(
          "flex h-[18rem] w-full min-w-0 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground",
          className
        )}
      >
        No chart data yet.
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
            contentStyle={{
              borderRadius: "0.5rem",
              border: "1px solid var(--border)",
              background: "var(--popover)",
              color: "var(--popover-foreground)",
              fontSize: "12px",
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
