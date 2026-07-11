"use client";

import { useMemo } from "react";
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
import { AnalyticsChartCard } from "@/components/manager/analytics/analytics-chart-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getTaskAverageGrade,
  getTaskCompletionBarData,
  getTaskStudentGradeLineData,
} from "@/lib/constants/manager-session-task-analytics";
import type { ManagerStudentTaskRow } from "@/types/manager-class-session-detail";

type SessionTaskAnalyticsSectionProps = {
  studentTasks: ManagerStudentTaskRow[];
  maxGrade: number | null;
};

function CompletionBarTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { label: string; value: number } }>;
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const item = payload[0].payload;

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-popover-foreground shadow-md">
      <p className="text-sm font-medium">{item.label}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Students:{" "}
        <span className="font-semibold text-foreground tabular-nums">
          {item.value}
        </span>
      </p>
    </div>
  );
}

function GradeBarTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { student_label: string; grade: number | null } }>;
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const item = payload[0].payload;

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-popover-foreground shadow-md">
      <p className="text-sm font-medium">{item.student_label}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Grade:{" "}
        <span className="font-semibold text-foreground tabular-nums">
          {item.grade ?? "—"}
        </span>
      </p>
    </div>
  );
}

export function SessionTaskAnalyticsSection({
  studentTasks,
  maxGrade,
}: SessionTaskAnalyticsSectionProps) {
  const completionData = useMemo(
    () => getTaskCompletionBarData(studentTasks),
    [studentTasks]
  );
  const gradeBarData = useMemo(
    () => getTaskStudentGradeLineData(studentTasks),
    [studentTasks]
  );
  const averageGrade = useMemo(
    () => getTaskAverageGrade(studentTasks),
    [studentTasks]
  );

  const finishedTotal = completionData[0]?.value ?? 0;
  const notFinishedTotal = completionData[1]?.value ?? 0;
  const yMax =
    maxGrade ??
    Math.max(...gradeBarData.map((point) => point.grade ?? 0), 20, 1);
  const xAngle = gradeBarData.length > 6 ? -35 : 0;

  return (
    <Card className="py-0">
      <CardHeader className="border-b bg-muted/40 py-3">
        <CardTitle>Task analytics</CardTitle>
        <p className="text-sm text-muted-foreground">
          Completion breakdown and per-student scores for this assignment.
        </p>
      </CardHeader>
      <CardContent className="grid gap-6 pt-2 pb-3 lg:grid-cols-2">
        <AnalyticsChartCard
          title="Completion"
          description={`${finishedTotal} finished · ${notFinishedTotal} not finished`}
        >
          <div className="h-[18rem] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={completionData}
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
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CompletionBarTooltip />} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={72}>
                  {completionData.map((entry) => (
                    <Cell key={entry.label} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Finished includes submitted, graded, and late student_tasks rows.
          </p>
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title="Scores by student"
          description={
            averageGrade === null
              ? "No graded submissions yet"
              : `Class average · ${averageGrade}${maxGrade !== null ? ` / ${maxGrade}` : ""}`
          }
        >
          <div className="h-[18rem] w-full min-w-0">
            {gradeBarData.length === 0 ? (
              <div className="flex h-full items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                No student scores yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={gradeBarData}
                  margin={{
                    top: 8,
                    right: 12,
                    left: 4,
                    bottom: xAngle ? 48 : 8,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="student_label"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    angle={xAngle}
                    textAnchor={xAngle ? "end" : "middle"}
                    interval={0}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, yMax]}
                    width={40}
                    label={{
                      value: "Grade",
                      angle: -90,
                      position: "insideLeft",
                      style: {
                        fontSize: 11,
                        fill: "var(--muted-foreground)",
                      },
                    }}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                    content={<GradeBarTooltip />}
                  />
                  {averageGrade !== null ? (
                    <ReferenceLine
                      y={averageGrade}
                      stroke="#f59e0b"
                      strokeDasharray="4 4"
                      label={{
                        value: `Avg ${averageGrade}`,
                        position: "right",
                        fontSize: 11,
                        fill: "var(--muted-foreground)",
                      }}
                    />
                  ) : null}
                  <Bar
                    dataKey="grade"
                    name="Student grade"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={48}
                  >
                    {gradeBarData.map((entry) => (
                      <Cell
                        key={entry.student_label}
                        fill={
                          entry.grade === null
                            ? "var(--muted)"
                            : averageGrade !== null &&
                                entry.grade >= averageGrade
                              ? "#8b5cf6"
                              : "#a78bfa"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Bar chart of each student&apos;s grade for this task. Dashed line
            shows the class average.
          </p>
        </AnalyticsChartCard>
      </CardContent>
    </Card>
  );
}
