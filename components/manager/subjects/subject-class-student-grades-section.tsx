"use client";

import { useMemo, useState } from "react";
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
import {
  Tabs as TabsPrimitive,
  TabsList as TabsListPrimitive,
  TabsTrigger as TabsTriggerPrimitive,
} from "@/components/animate-ui/primitives/animate/tabs";
import { HorizontalScrollCarousel } from "@/components/ui/horizontal-scroll-carousel";
import {
  getClassAverageFromStudentGrades,
  getManagerClassStudentGrades,
  type ManagerClassStudentGrade,
} from "@/lib/constants/manager-subject-grades-mock";
import { MANAGER_CLASS_STATUS_DOT_CLASSES } from "@/lib/constants/manager-class-display";
import { cn } from "@/lib/utils";
import type { ManagerSubjectClassRow } from "@/types/manager-subject-class";

const BAR_COLOR = "#10b981";
const BAR_COLOR_MUTED = "#a7f3d0";

type SubjectClassStudentGradesSectionProps = {
  classes: ManagerSubjectClassRow[];
  subjectName: string;
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

function StudentGradeTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ManagerClassStudentGrade }>;
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const grade = payload[0].payload;

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-popover-foreground shadow-md">
      <p className="text-sm font-medium">{grade.studentName}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Final grade:{" "}
        <span className="font-semibold text-foreground tabular-nums">
          {grade.finalGrade.toFixed(1)}
        </span>
      </p>
    </div>
  );
}

function ClassStudentGradesChart({
  classRow,
  visible = true,
}: {
  classRow: ManagerSubjectClassRow;
  visible?: boolean;
}) {
  const studentGrades = useMemo(
    () => getManagerClassStudentGrades(classRow),
    [classRow]
  );

  const classAverage = useMemo(
    () => getClassAverageFromStudentGrades(studentGrades),
    [studentGrades]
  );

  const highestGrade = studentGrades[0]?.finalGrade ?? 0;
  const lowestGrade = studentGrades[studentGrades.length - 1]?.finalGrade ?? 0;

  if (studentGrades.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No preview grades for this class yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <GradeStatCard
          label="Class average"
          value={classAverage.toFixed(1)}
          hint={`${studentGrades.length} students`}
          accentClassName="border-l-emerald-500"
        />
        <GradeStatCard
          label="Highest grade"
          value={highestGrade.toFixed(1)}
          hint={studentGrades[0]?.studentName}
          accentClassName="border-l-sky-500"
        />
        <GradeStatCard
          label="Lowest grade"
          value={lowestGrade.toFixed(1)}
          hint={studentGrades[studentGrades.length - 1]?.studentName}
          accentClassName="border-l-amber-500"
        />
      </div>

      <div className="rounded-xl border p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">Student grades in {classRow.name}</p>
          <p className="text-xs text-muted-foreground">
            Dashed line marks the class average (
            <span className="tabular-nums">{classAverage.toFixed(1)}</span>)
          </p>
        </div>

        <div className="h-80 w-full">
          {visible ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={studentGrades}
                margin={{ top: 8, right: 8, bottom: 8, left: -16 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--border)"
                />
                <XAxis
                  dataKey="studentName"
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  height={64}
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  tickFormatter={(value: string) =>
                    value.length > 12 ? `${value.slice(0, 11)}…` : value
                  }
                  angle={
                    studentGrades.length > 8
                      ? -35
                      : studentGrades.length > 4
                        ? -20
                        : 0
                  }
                  textAnchor={studentGrades.length > 4 ? "end" : "middle"}
                />
                <YAxis
                  domain={[0, 100]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                />
                <Tooltip
                  cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                  content={<StudentGradeTooltip />}
                />
                <ReferenceLine
                  y={classAverage}
                  stroke="var(--muted-foreground)"
                  strokeDasharray="4 4"
                />
                <Bar dataKey="finalGrade" radius={[6, 6, 0, 0]} maxBarSize={40}>
                  {studentGrades.map((grade) => (
                    <Cell
                      key={grade.studentId}
                      fill={
                        grade.finalGrade >= classAverage
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

        <div className="mt-4 overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[320px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Student</th>
                <th className="px-3 py-2 text-right font-medium">Grade</th>
              </tr>
            </thead>
            <tbody>
              {studentGrades.map((grade) => (
                <tr key={grade.studentId} className="border-t">
                  <td className="px-3 py-2">{grade.studentName}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {grade.finalGrade.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-sm"
              style={{ backgroundColor: BAR_COLOR }}
            />
            At or above class average
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-sm"
              style={{ backgroundColor: BAR_COLOR_MUTED }}
            />
            Below class average
          </span>
        </div>
      </div>
    </div>
  );
}

export function SubjectClassStudentGradesSection({
  classes,
  subjectName,
  visible = true,
}: SubjectClassStudentGradesSectionProps) {
  const [activeTab, setActiveTab] = useState(classes[0]?.id ?? "");

  const activeClass = useMemo(
    () => classes.find((classRow) => classRow.id === activeTab) ?? classes[0],
    [activeTab, classes]
  );

  if (classes.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No classes in {subjectName} yet, so there are no student grades to show.
      </p>
    );
  }

  return (
    <TabsPrimitive
      value={activeTab || classes[0]!.id}
      onValueChange={setActiveTab}
      className="flex min-w-0 flex-col gap-4"
    >
      <div className="min-w-0 overflow-hidden rounded-xl bg-muted/25 p-2 ring-1 ring-foreground/8">
        <HorizontalScrollCarousel
          ariaLabel="Class tabs for student grades"
          className="rounded-lg"
          navButtonClassName="size-8 rounded-full text-muted-foreground hover:bg-background/80 hover:text-foreground disabled:opacity-30"
        >
          <TabsListPrimitive className="inline-flex h-auto w-max max-w-none flex-nowrap items-center gap-2 bg-transparent p-1">
            {classes.map((classRow) => (
              <TabsTriggerPrimitive
                key={classRow.id}
                value={classRow.id}
                className={cn(
                  "inline-flex max-w-none shrink-0 flex-none items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200",
                  "border-transparent text-muted-foreground hover:border-border/60 hover:bg-background/80 hover:text-foreground hover:shadow-sm",
                  "data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md",
                  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                )}
              >
                <span
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    MANAGER_CLASS_STATUS_DOT_CLASSES[classRow.status]
                  )}
                  aria-hidden="true"
                />
                <span className="whitespace-nowrap">{classRow.name}</span>
              </TabsTriggerPrimitive>
            ))}
          </TabsListPrimitive>
        </HorizontalScrollCarousel>
      </div>

      {activeClass ? (
        <ClassStudentGradesChart classRow={activeClass} visible={visible} />
      ) : null}
    </TabsPrimitive>
  );
}
