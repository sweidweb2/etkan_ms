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
import { cn } from "@/lib/utils";
import {
  getManagerClassGradeSummaries,
  getSubjectAverageGrade,
  type ManagerClassGradeSummary,
} from "@/lib/constants/manager-subject-grades-mock";
import type { ManagerSubjectClassRow } from "@/types/manager-subject-class";

const BAR_COLOR = "#0ea5e9";
const BAR_COLOR_MUTED = "#bae6fd";

type SubjectGradesSectionProps = {
  classes: ManagerSubjectClassRow[];
  visible?: boolean;
};

function GradeStatCard({
  label,
  value,
  hint,
  accentClassName,
}: {
  label: string;
  value: string;
  hint?: string;
  accentClassName: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border-l-4 bg-card py-4 pr-5 pl-4 ring-1 ring-foreground/10",
        accentClassName
      )}
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function GradeTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ManagerClassGradeSummary }>;
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const summary = payload[0].payload;

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-popover-foreground shadow-md">
      <p className="text-sm font-medium">{summary.className}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Average grade:{" "}
        <span className="font-semibold text-foreground tabular-nums">
          {summary.averageGrade.toFixed(1)}
        </span>
      </p>
      <p className="text-xs text-muted-foreground">
        Students: <span className="tabular-nums">{summary.studentCount}</span>
      </p>
    </div>
  );
}

export function SubjectGradesSection({
  classes,
  visible = true,
}: SubjectGradesSectionProps) {
  const summaries = useMemo(
    () => getManagerClassGradeSummaries(classes),
    [classes]
  );

  const subjectAverage = useMemo(
    () => getSubjectAverageGrade(summaries),
    [summaries]
  );

  const totalStudents = summaries.reduce(
    (sum, summary) => sum + summary.studentCount,
    0
  );

  const bestClass = summaries.reduce<ManagerClassGradeSummary | null>(
    (best, summary) =>
      !best || summary.averageGrade > best.averageGrade ? summary : best,
    null
  );

  const lowestClass = summaries.reduce<ManagerClassGradeSummary | null>(
    (lowest, summary) =>
      !lowest || summary.averageGrade < lowest.averageGrade ? summary : lowest,
    null
  );

  return (
    <div className="flex flex-col gap-6">
      {summaries.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No classes yet, so there are no grades to show.
        </p>
      ) : (
        <>
            <div className="grid gap-4 sm:grid-cols-3">
              <GradeStatCard
                label="Subject average"
                value={subjectAverage.toFixed(1)}
                hint={`Across ${totalStudents} students`}
                accentClassName="border-l-sky-500"
              />
              <GradeStatCard
                label="Highest class average"
                value={bestClass ? bestClass.averageGrade.toFixed(1) : "—"}
                hint={bestClass?.className}
                accentClassName="border-l-emerald-500"
              />
              <GradeStatCard
                label="Lowest class average"
                value={lowestClass ? lowestClass.averageGrade.toFixed(1) : "—"}
                hint={lowestClass?.className}
                accentClassName="border-l-amber-500"
              />
            </div>

            <div className="rounded-xl border p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  Average grade per class
                </p>
                <p className="text-xs text-muted-foreground">
                  Dashed line marks the subject average (
                  <span className="tabular-nums">
                    {subjectAverage.toFixed(1)}
                  </span>
                  )
                </p>
              </div>

              <div className="h-72 w-full">
                {visible ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={summaries}
                      margin={{ top: 8, right: 8, bottom: 8, left: -16 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="var(--border)"
                      />
                      <XAxis
                        dataKey="className"
                        tickLine={false}
                        axisLine={false}
                        interval={0}
                        height={56}
                        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                        tickFormatter={(value: string) =>
                          value.length > 14 ? `${value.slice(0, 13)}…` : value
                        }
                        angle={summaries.length > 4 ? -25 : 0}
                        textAnchor={summaries.length > 4 ? "end" : "middle"}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      />
                      <Tooltip
                        cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                        content={<GradeTooltip />}
                      />
                      <ReferenceLine
                        y={subjectAverage}
                        stroke="var(--muted-foreground)"
                        strokeDasharray="4 4"
                      />
                      <Bar
                        dataKey="averageGrade"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={48}
                      >
                        {summaries.map((summary) => (
                          <Cell
                            key={summary.classId}
                            fill={
                              summary.averageGrade >= subjectAverage
                                ? BAR_COLOR
                                : BAR_COLOR_MUTED
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full w-full rounded-lg bg-muted/20" />
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="size-2.5 rounded-sm"
                    style={{ backgroundColor: BAR_COLOR }}
                  />
                  At or above subject average
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="size-2.5 rounded-sm"
                    style={{ backgroundColor: BAR_COLOR_MUTED }}
                  />
                  Below subject average
                </span>
              </div>

              <div className="mt-4 overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[360px] text-sm">
                  <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Class</th>
                      <th className="px-3 py-2 text-right font-medium">
                        Average
                      </th>
                      <th className="px-3 py-2 text-right font-medium">
                        Students
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaries.map((summary) => (
                      <tr key={summary.classId} className="border-t">
                        <td className="px-3 py-2">{summary.className}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {summary.averageGrade.toFixed(1)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {summary.studentCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
    </div>
  );
}
