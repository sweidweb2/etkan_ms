"use client";

import { format } from "date-fns";
import { ClassLineChart } from "@/components/manager/students/class-line-chart";
import { ClassTabCollapsibleSection } from "@/components/manager/students/class-tab-collapsible-section";
import { StudentTaskStatusBadge } from "@/components/manager/students/student-task-status-badge";
import {
  MANAGER_STUDENT_TASK_SLOTS_MAX_HEIGHT_CLASS,
  MANAGER_STUDENT_TASK_SLOTS_MAX_VISIBLE,
} from "@/lib/constants/manager-student-class-slots";
import { MANAGER_STUDENT_TASK_SLOT_CLASSES } from "@/lib/constants/manager-student-task-display";
import { getManagerStudentClassDetailPreview } from "@/lib/manager/get-manager-student-class-detail-preview";
import { cn } from "@/lib/utils";

type ClassTasksSectionProps = {
  userId: string;
  classId: string;
};

export function ClassTasksSection({ userId, classId }: ClassTasksSectionProps) {
  const detail = getManagerStudentClassDetailPreview(userId, classId);
  const taskOverflow = detail.tasks.length > MANAGER_STUDENT_TASK_SLOTS_MAX_VISIBLE;

  const gradeChartData = detail.taskGradeTrend.map((point) => ({
    task_label: point.task_label,
    grade: point.grade,
    max_grade: point.max_grade,
  }));

  return (
    <ClassTabCollapsibleSection
      title="Tasks"
      description="Task slots from tasks + student_tasks with grade trend per assignment."
    >
      <div className="grid min-h-[22rem] min-w-0 gap-6 p-5 lg:grid-cols-2 lg:items-stretch">
        <div className="flex min-h-0 min-w-0 flex-col space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Task slots
            </p>
            {taskOverflow ? (
              <p className="text-[11px] text-muted-foreground">
                {detail.tasks.length} total · scroll
              </p>
            ) : null}
          </div>
          <div
            className={cn(
              "grid min-h-0 flex-1 content-start gap-2.5 overflow-y-auto overscroll-y-contain",
              MANAGER_STUDENT_TASK_SLOTS_MAX_HEIGHT_CLASS
            )}
          >
            {detail.tasks.map((task) => (
              <div
                key={task.student_task_id}
                className={cn(
                  "rounded-lg border px-3 py-2.5",
                  MANAGER_STUDENT_TASK_SLOT_CLASSES[task.status]
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium leading-snug">{task.title}</p>
                  <StudentTaskStatusBadge status={task.status} />
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  <div>
                    <dt className="inline">Due: </dt>
                    <dd className="inline text-foreground">
                      {task.due_date
                        ? format(new Date(task.due_date), "MMM d, yyyy")
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline">Max: </dt>
                    <dd className="inline text-foreground">{task.max_grade}</dd>
                  </div>
                  <div>
                    <dt className="inline">Grade: </dt>
                    <dd className="inline text-foreground">
                      {task.grade ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline">Session: </dt>
                    <dd className="inline text-foreground">
                      {task.session_id ?? "—"}
                    </dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </div>

        <div className="flex min-h-[20rem] min-w-0 flex-col space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Grade trend (line)
          </p>
          <ClassLineChart
            className="min-h-[18rem] flex-1"
            data={gradeChartData}
            xKey="task_label"
            yLabel="Grade"
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
          <p className="text-xs text-muted-foreground">
            Line chart of graded tasks only (student_tasks.grade vs tasks.max_grade).
          </p>
        </div>
      </div>
    </ClassTabCollapsibleSection>
  );
}
