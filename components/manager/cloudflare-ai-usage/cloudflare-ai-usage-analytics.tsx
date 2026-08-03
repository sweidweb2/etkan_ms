"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AnalyticsChartCard } from "@/components/manager/analytics/analytics-chart-card";
import { ClassLineChart } from "@/components/manager/students/class-line-chart";
import {
  buildCloudflareAiUsageDailySeries,
  summarizeCloudflareAiUsageSeries,
} from "@/lib/manager/cloudflare-ai-usage-analytics";
import type { ManagerCloudflareAiUsageRow } from "@/types/manager-cloudflare-ai-usage";

type CloudflareAiUsageAnalyticsProps = {
  records: ManagerCloudflareAiUsageRow[];
};

export function CloudflareAiUsageAnalytics({
  records,
}: CloudflareAiUsageAnalyticsProps) {
  const series = useMemo(
    () => buildCloudflareAiUsageDailySeries(records, 14),
    [records]
  );
  const totals = useMemo(
    () => summarizeCloudflareAiUsageSeries(series),
    [series]
  );

  const usageChartData = series.map((point) => ({
    label: point.label,
    total_tokens: point.total_tokens,
    requests: point.requests,
  }));

  const hasRequestBars = series.some((point) => point.requests > 0);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <AnalyticsChartCard
        title="Token usage"
        description={
          totals.total_tokens > 0
            ? `${totals.total_tokens.toLocaleString()} tokens over the last 14 days`
            : "Token volume over the last 14 days"
        }
      >
        <ClassLineChart
          data={usageChartData}
          xKey="label"
          yLabel="Tokens"
          emptyMessage="No AI usage yet. Ask the schedule assistant to populate this chart."
          formatTooltipSeriesValue={(value) =>
            `${value.toLocaleString()} tokens`
          }
          getTooltipExtraLines={(point) => {
            const requests = Number(point.requests ?? 0);
            return [
              `${requests.toLocaleString()} request${requests === 1 ? "" : "s"}`,
            ];
          }}
          series={[
            {
              key: "total_tokens",
              label: "Total tokens",
              color: "#0ea5e9",
            },
          ]}
        />
        <p className="mt-3 text-xs text-muted-foreground">
          Daily token totals from logged Cloudflare Workers AI calls.
        </p>
      </AnalyticsChartCard>

      <AnalyticsChartCard
        title="Request usage"
        description={
          totals.requests > 0
            ? `${totals.requests.toLocaleString()} requests over the last 14 days`
            : "Request count over the last 14 days"
        }
      >
        <div className="h-[18rem] w-full min-w-0">
          {!hasRequestBars ? (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed px-4 text-center text-sm text-muted-foreground">
              No AI usage yet. Ask the schedule assistant to populate this chart.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={usageChartData}
                margin={{ top: 8, right: 12, left: 4, bottom: 8 }}
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
                  interval="preserveStartEnd"
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                  label={{
                    value: "Requests",
                    angle: -90,
                    position: "insideLeft",
                    style: {
                      fontSize: 11,
                      fill: "var(--muted-foreground)",
                    },
                  }}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) {
                      return null;
                    }
                    const point = payload[0]?.payload as
                      | {
                          requests?: number;
                          total_tokens?: number;
                        }
                      | undefined;
                    if (!point) {
                      return null;
                    }
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
                        <p className="mt-1">
                          Requests: {(point.requests ?? 0).toLocaleString()}
                        </p>
                        <p className="mt-1 text-muted-foreground">
                          Tokens: {(point.total_tokens ?? 0).toLocaleString()}
                        </p>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="requests"
                  name="Requests"
                  fill="#6366f1"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={36}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Daily request counts from the same usage log.
        </p>
      </AnalyticsChartCard>
    </div>
  );
}
