"use client";

import { format } from "date-fns";
import { ListTodoIcon } from "lucide-react";
import { ClassLineChart } from "@/components/manager/students/class-line-chart";
import { ClassTabCollapsibleSection } from "@/components/manager/students/class-tab-collapsible-section";
import { StudentTaskStatusBadge } from "@/components/manager/students/student-task-status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { MANAGER_STUDENT_TASK_SLOTS_MAX_HEIGHT_CLASS } from "@/lib/constants/manager-student-class-slots";
import { formatTaskGrade } from "@/lib/format/format-task-grade";
import { cn } from "@/lib/utils";
import type { ManagerStudentClassTabDetail } from "@/types/manager-student-class-detail";

type ClassTasksSectionProps = {
  detail: ManagerStudentClassTabDetail;
};

export function ClassTasksSection({ detail }: ClassTasksSectionProps) {
  const gradeChartData = detail.taskGradeTrend.map((point) => ({
    task_label: point.task_label,
    grade: point.grade,
    max_grade: point.max_grade,
  }));

  return (
    <ClassTabCollapsibleSection
      title="Tasks"
      description="Task grades for this class with a grade trend chart."
    >
      <div className="grid min-h-[22rem] min-w-0 gap-6 p-5 @2xl/panel:grid-cols-2 @2xl/panel:items-stretch">
        <div className="flex min-h-0 min-w-0 flex-col space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Task grades
          </p>
          {detail.tasks.length === 0 ? (
            <EmptyState
              size="sm"
              icon={ListTodoIcon}
              title="No tasks yet"
              description="No tasks found for this class yet."
            />
          ) : (
            <div
              className={cn(
                "min-h-0 flex-1 overflow-auto overscroll-y-contain rounded-xl border",
                MANAGER_STUDENT_TASK_SLOTS_MAX_HEIGHT_CLASS
              )}
            >
              <table className="w-full min-w-[28rem] text-left text-sm">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Task</th>
                    <th className="px-3 py-2 font-medium">Session</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Grade</th>
                    <th className="px-3 py-2 font-medium">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.tasks.map((task) => (
                    <tr key={task.student_task_id} className="border-b last:border-b-0">
                      <td className="max-w-[10rem] px-3 py-2.5 font-medium">
                        <span className="line-clamp-2">{task.title}</span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                        {task.session_label ?? "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        <StudentTaskStatusBadge status={task.status} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">
                        {formatTaskGrade({
                          grade: task.grade,
                          maxGrade: task.max_grade,
                          isYesNo: task.is_yes_no,
                        })}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                        {task.due_date
                          ? format(new Date(task.due_date), "MMM d, yyyy")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex min-h-[20rem] min-w-0 flex-col space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Grade trend
          </p>
          <ClassLineChart
            className="min-h-[18rem] flex-1"
            data={gradeChartData}
            xKey="task_label"
            yLabel="Grade"
            emptyMessage="No graded tasks yet."
            series={[
              {
                key: "grade",
                label: "Student grade",
                color: "#8b5cf6",
              },
              {
                key: "max_grade",
                label: "Max grade",
                color: "#94a3b8",
              },
            ]}
          />
          {gradeChartData.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              Line chart of graded tasks only (grade vs max grade).
            </p>
          ) : null}
        </div>
      </div>
    </ClassTabCollapsibleSection>
  );
}
