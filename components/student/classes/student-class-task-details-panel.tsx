"use client";

import { format } from "date-fns";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { StudentTaskFiles } from "@/components/student/classes/student-task-files";
import { StudentTaskStatusBadge } from "@/components/manager/students/student-task-status-badge";
import {
  getStudentClassDetailRoute,
  ROUTES,
} from "@/lib/constants/routes";
import type { StudentClassTaskDetailForSelf } from "@/types/student-class";

type StudentClassTaskDetailsPanelProps = {
  detail: StudentClassTaskDetailForSelf;
};

export function StudentClassTaskDetailsPanel({
  detail,
}: StudentClassTaskDetailsPanelProps) {
  const { classRow, task, studentTask } = detail;

  const description = task.description?.trim() ?? "";

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={ROUTES.STUDENT_CLASSES} prefetch={false}>
              My classes
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink
              href={getStudentClassDetailRoute(classRow.class_id)}
              prefetch={false}
            >
              {classRow.name}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{task.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{task.title}</h2>
        <dl className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
          <div className="flex items-baseline gap-1.5">
            <dt className="text-muted-foreground">Session</dt>
            <dd className="font-medium">{task.session_label ?? "—"}</dd>
          </div>
          <div className="flex items-baseline gap-1.5">
            <dt className="text-muted-foreground">Due</dt>
            <dd className="font-medium">
              {task.due_date
                ? format(new Date(task.due_date), "MMM d, yyyy")
                : "—"}
            </dd>
          </div>
          <div className="flex items-baseline gap-1.5">
            <dt className="text-muted-foreground">Grade</dt>
            <dd className="font-medium tabular-nums">
              {studentTask?.grade == null
                ? `—/${task.max_grade}`
                : `${studentTask.grade}/${task.max_grade}`}
            </dd>
          </div>
          <div className="flex items-center gap-1.5">
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              {studentTask ? (
                <StudentTaskStatusBadge status={studentTask.status} />
              ) : (
                <span className="text-muted-foreground">Not assigned</span>
              )}
            </dd>
          </div>
          {studentTask?.submitted_at ? (
            <div className="flex items-baseline gap-1.5">
              <dt className="text-muted-foreground">Submitted</dt>
              <dd className="font-medium">
                {format(new Date(studentTask.submitted_at), "MMM d, yyyy")}
              </dd>
            </div>
          ) : null}
        </dl>
        {description ? (
          <p className="max-w-prose text-sm whitespace-pre-wrap">{description}</p>
        ) : null}
      </div>

      <StudentTaskFiles
        studentTaskId={studentTask?.id ?? null}
        uploads={detail.uploads ?? []}
      />
    </div>
  );
}
