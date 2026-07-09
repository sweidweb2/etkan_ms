"use client";

import { format } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  computeManagerStudentCourseFinalGrade,
  computeManagerStudentCourseGradeWeightTotal,
  formatCourseGradeValue,
  formatCourseGradeWeight,
  getManagerStudentCourseGradeComponents,
  getManagerStudentCourseGradeTypeLabel,
  getManagerStudentCourseGradeWeightRules,
  MANAGER_STUDENT_COURSE_GRADE_COMPONENT_ACCENT,
} from "@/lib/constants/manager-student-course-grade-display";
import { ClassTabCollapsibleSection } from "@/components/manager/students/class-tab-collapsible-section";
import { getManagerStudentClassDetailPreview } from "@/lib/manager/get-manager-student-class-detail-preview";
import { cn } from "@/lib/utils";

type ClassCourseGradeSectionProps = {
  userId: string;
  classId: string;
};

function GradeComponentCard({
  label,
  grade,
  weight,
  weightedPoints,
  accentClassName,
  barColor,
}: {
  label: string;
  grade: number | null;
  weight: number | null;
  weightedPoints: number | null;
  accentClassName: string;
  barColor: string;
}) {
  const gradePercent = grade ?? 0;

  return (
    <div
      className={cn(
        "rounded-lg border bg-card px-3 py-3 border-l-4",
        accentClassName
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-lg font-semibold tabular-nums">
          {formatCourseGradeValue(grade)}
        </p>
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <div>
          <dt className="inline">Weight: </dt>
          <dd className="inline text-foreground">{formatCourseGradeWeight(weight)}</dd>
        </div>
        <div>
          <dt className="inline">Contribution: </dt>
          <dd className="inline text-foreground">
            {weightedPoints == null ? "—" : `${weightedPoints.toFixed(1)} pts`}
          </dd>
        </div>
      </dl>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.min(Math.max(gradePercent, 0), 100)}%`,
            backgroundColor: barColor,
          }}
        />
      </div>
    </div>
  );
}

export function ClassCourseGradeSection({
  userId,
  classId,
}: ClassCourseGradeSectionProps) {
  const detail = getManagerStudentClassDetailPreview(userId, classId);
  const courseGrade = detail.courseGrade;

  if (!courseGrade) {
    return (
      <ClassTabCollapsibleSection
        title="Course grade"
        description="Weighted grade snapshot from student_course_grade."
      >
        <div className="flex min-h-[12rem] items-center justify-center p-6 text-sm text-muted-foreground">
          No course grade record for this enrollment yet.
        </div>
      </ClassTabCollapsibleSection>
    );
  }

  const components = getManagerStudentCourseGradeComponents(courseGrade);
  const weightRules = getManagerStudentCourseGradeWeightRules(courseGrade);
  const weightTotal = computeManagerStudentCourseGradeWeightTotal(courseGrade);
  const finalGrade = computeManagerStudentCourseFinalGrade(courseGrade);
  const chartData = components
    .filter((component) => component.grade != null)
    .map((component) => ({
      label: component.label,
      grade: component.grade as number,
      color: component.color,
    }));

  return (
    <ClassTabCollapsibleSection
      title="Course grade"
      description="Weighted breakdown from student_course_grade (attendee, total tasks, group grade, final exams)."
    >
      <div className="space-y-5 p-5">
        <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl bg-muted/25 px-4 pt-2 pb-3 ring-1 ring-foreground/8">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Weighted final score
            </p>
            <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">
              {formatCourseGradeValue(finalGrade)}
            </p>
          </div>
          <dl className="grid gap-2 text-sm sm:grid-cols-2 sm:gap-x-6">
            <div>
              <dt className="text-xs text-muted-foreground">Grade type</dt>
              <dd className="font-medium">
                {getManagerStudentCourseGradeTypeLabel(courseGrade.type)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Recorded</dt>
              <dd className="font-medium">
                {format(new Date(courseGrade.created_at), "MMM d, yyyy")}
              </dd>
            </div>
          </dl>
        </div>

        <div className="grid min-h-[22rem] min-w-0 gap-6 lg:grid-cols-2 lg:items-stretch">
          <div className="flex min-h-[20rem] min-w-0 flex-col space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Grade components
            </p>
            <div className="grid min-h-[18rem] flex-1 content-start gap-2.5 overflow-y-auto">
              {components.map((component) => (
                <GradeComponentCard
                  key={component.key}
                  label={component.label}
                  grade={component.grade}
                  weight={component.weight}
                  weightedPoints={component.weightedPoints}
                  accentClassName={
                    MANAGER_STUDENT_COURSE_GRADE_COMPONENT_ACCENT[component.key]
                  }
                  barColor={component.color}
                />
              ))}
            </div>
          </div>

          <div className="flex min-h-[20rem] min-w-0 flex-col gap-6">
            <div className="flex min-h-[10rem] flex-1 flex-col space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Component scores
              </p>
              {chartData.length === 0 ? (
                <div className="flex min-h-[10rem] flex-1 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                  No component grades to chart yet.
                </div>
              ) : (
                <div className="min-h-[10rem] flex-1 w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-border/60"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        formatter={(value) => [
                          formatCourseGradeValue(Number(value)),
                          "Score",
                        ]}
                        contentStyle={{
                          borderRadius: "0.5rem",
                          border: "1px solid hsl(var(--border))",
                          background: "hsl(var(--popover))",
                          color: "hsl(var(--popover-foreground))",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="grade" radius={[6, 6, 0, 0]} maxBarSize={48}>
                        {chartData.map((entry) => (
                          <Cell key={entry.label} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Weight rules
                </p>
                <p className="text-xs tabular-nums text-muted-foreground">
                  Total {formatCourseGradeWeight(weightTotal)}
                </p>
              </div>
              <div className="space-y-2 rounded-lg border bg-muted/15 p-3">
                {weightRules.map((rule) => (
                  <div key={rule.key} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-medium">{rule.label}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {formatCourseGradeWeight(rule.weight)}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(Math.max(rule.weight ?? 0, 0), 100)}%`,
                          backgroundColor: rule.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Four grading weights: group grade, final exams, total tasks, and
                attendee (from task_json_grade_weights / weight columns).
              </p>
            </div>
          </div>
        </div>
      </div>
    </ClassTabCollapsibleSection>
  );
}
