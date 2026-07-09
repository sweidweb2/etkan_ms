"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SessionTaskStudentTasksSection } from "@/components/manager/classes/session-task-student-tasks-section";
import { SessionTaskAnalyticsSection } from "@/components/manager/classes/session-task-analytics-section";
import { getManagerSessionStudentTasksPreview } from "@/lib/constants/manager-session-student-tasks-mock";
import { getManagerClassPreview } from "@/lib/manager/get-manager-class-preview";
import { getManagerClassSessionPreview } from "@/lib/manager/get-manager-class-session-preview";
import { getManagerSessionTaskPreview } from "@/lib/manager/get-manager-session-task-preview";
import {
  getManagerClassDetailRoute,
  getManagerClassSessionDetailRoute,
  ROUTES,
} from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import type {
  ManagerSessionTaskRow,
  ManagerStudentTaskRow,
} from "@/types/manager-class-session-detail";

type SessionTaskDetailsPanelProps = {
  classId: string;
  sessionId: string;
  taskId: string;
};

function DetailField({
  label,
  value,
  children,
  className,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className={cn("text-sm text-foreground", className)}>
        {children ?? value ?? "—"}
      </dd>
    </div>
  );
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "—";
  }

  return format(new Date(value), "MMM d, yyyy 'at' h:mm a");
}

export function SessionTaskDetailsPanel({
  classId,
  sessionId,
  taskId,
}: SessionTaskDetailsPanelProps) {
  const classRow = getManagerClassPreview(classId);
  const session = getManagerClassSessionPreview(classId, sessionId);
  const task = useMemo(
    () => getManagerSessionTaskPreview(classId, sessionId, taskId),
    [classId, sessionId, taskId]
  );
  const studentTasksSyncKey = `${classId}:${sessionId}:${taskId}`;
  const [studentTasks, setStudentTasks] = useState<ManagerStudentTaskRow[]>(
    () => {
      const previewTask = getManagerSessionTaskPreview(
        classId,
        sessionId,
        taskId
      );

      return previewTask
        ? getManagerSessionStudentTasksPreview(classId, previewTask)
        : [];
    }
  );
  const [prevStudentTasksSyncKey, setPrevStudentTasksSyncKey] =
    useState(studentTasksSyncKey);

  if (studentTasksSyncKey !== prevStudentTasksSyncKey) {
    setPrevStudentTasksSyncKey(studentTasksSyncKey);
    setStudentTasks(
      task ? getManagerSessionStudentTasksPreview(classId, task) : []
    );
  }

  if (!session || !task) {
    return (
      <div className="flex flex-col gap-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href={ROUTES.MANAGER_CLASSES}>
                Manage classes
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href={getManagerClassDetailRoute(classId)}>
                {classRow.name}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {session ? (
                <BreadcrumbLink
                  href={getManagerClassSessionDetailRoute(classId, sessionId)}
                >
                  S{session.nb_order} · {session.topic}
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>Session</BreadcrumbPage>
              )}
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Task not found</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Card className="py-0">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            This task could not be found for the selected session.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={ROUTES.MANAGER_CLASSES}>
              Manage classes
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={getManagerClassDetailRoute(classId)}>
              {classRow.name}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink
              href={getManagerClassSessionDetailRoute(classId, sessionId)}
            >
              S{session.nb_order} · {session.topic}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{task.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card className="py-0">
        <CardHeader className="border-b bg-muted/50 py-4">
          <CardTitle className="text-xl">{task.title}</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 pb-4">
          <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <DetailField label="Title" value={task.title} />
            <DetailField label="Description" value={task.description ?? "—"} />
            <DetailField label="Due date" value={formatDateTime(task.due_date)} />
            <DetailField
              label="Max grade"
              value={task.max_grade === null ? "—" : String(task.max_grade)}
              className="tabular-nums"
            />
            <DetailField label="Session">
              <Link
                href={getManagerClassSessionDetailRoute(classId, sessionId)}
                className="text-primary underline-offset-4 hover:underline"
              >
                S{session.nb_order} · {session.topic}
              </Link>
            </DetailField>
            <DetailField label="Class">
              <Link
                href={getManagerClassDetailRoute(classId)}
                className="text-primary underline-offset-4 hover:underline"
              >
                {classRow.name}
              </Link>
            </DetailField>
            <DetailField
              label="Session ID"
              value={task.session_id}
              className="font-mono text-xs"
            />
            <DetailField
              label="Task ID"
              value={task.id}
              className="font-mono text-xs"
            />
            <DetailField label="Created" value={formatDateTime(task.created_at)} />
          </dl>
        </CardContent>
      </Card>

      <SessionTaskStudentTasksSection
        classId={classId}
        task={task}
        studentTasks={studentTasks}
        onStudentTasksChange={setStudentTasks}
      />

      <SessionTaskAnalyticsSection
        studentTasks={studentTasks}
        maxGrade={task.max_grade}
      />
    </div>
  );
}
