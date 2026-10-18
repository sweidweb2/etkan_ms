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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  return (
    <div className="flex flex-col gap-6">
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

      <Card>
        <CardHeader>
          <CardTitle>{task.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Session</dt>
              <dd className="font-medium">{task.session_label ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Due date</dt>
              <dd className="font-medium">
                {task.due_date
                  ? format(new Date(task.due_date), "MMM d, yyyy")
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Max grade</dt>
              <dd className="font-medium tabular-nums">{task.max_grade}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Your status</dt>
              <dd className="mt-1">
                {studentTask ? (
                  <StudentTaskStatusBadge status={studentTask.status} />
                ) : (
                  <span className="text-muted-foreground">Not assigned</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Your grade</dt>
              <dd className="font-medium tabular-nums">
                {studentTask?.grade == null
                  ? "—"
                  : `${studentTask.grade}/${task.max_grade}`}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Submitted</dt>
              <dd className="font-medium">
                {studentTask?.submitted_at
                  ? format(
                      new Date(studentTask.submitted_at),
                      "MMM d, yyyy h:mm a"
                    )
                  : "—"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Description</dt>
              <dd className="mt-1 whitespace-pre-wrap text-foreground">
                {task.description?.trim() ? task.description : "—"}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <CardHeader className="border-b px-4 py-2.5">
          <CardTitle className="text-sm">Files</CardTitle>
        </CardHeader>
        <CardContent className="px-4 py-3">
          <StudentTaskFiles
            studentTaskId={studentTask?.id ?? null}
            uploads={detail.uploads ?? []}
          />
        </CardContent>
      </Card>
    </div>
  );
}
