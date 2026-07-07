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
};

export function ClassLineChart({
  data,
  series,
  xKey,
  className,
  yDomain,
  yLabel,
}: ClassLineChartProps) {
  if (data.length === 0) {
    return (
      <div
        className={cn(
          "flex min-h-[18rem] w-full min-w-0 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground",
          className
        )}
      >
        No chart data yet.
      </div>
    );
  }

  return (
    <div className={cn("h-full min-h-[18rem] w-full min-w-0", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            domain={yDomain}
            label={
              yLabel
                ? {
                    value: yLabel,
                    angle: -90,
                    position: "insideLeft",
                    style: { fontSize: 11 },
                  }
                : undefined
            }
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
          {series.length > 1 ? <Legend wrapperStyle={{ fontSize: "12px" }} /> : null}
          {series.map((item) => (
            <Line
              key={item.key}
              type="monotone"
              dataKey={item.key}
              name={item.label}
              stroke={item.color}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
