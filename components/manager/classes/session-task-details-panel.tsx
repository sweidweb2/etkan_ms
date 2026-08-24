"use client";

import Link from "next/link";
import { useState } from "react";
import { format } from "date-fns";
import { PencilIcon } from "lucide-react";
import { Can } from "@/components/auth/can";
import { EditSessionTaskDialog } from "@/components/manager/classes/edit-session-task-dialog";
import { SessionTaskStudentTasksSection } from "@/components/manager/classes/session-task-student-tasks-section";
import { SessionTaskAnalyticsSection } from "@/components/manager/classes/session-task-analytics-section";
import { Button } from "@/components/ui/button";
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
import {
  getManagerClassDetailRoute,
  getManagerClassSessionDetailRoute,
  ROUTES,
} from "@/lib/constants/routes";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { cn } from "@/lib/utils";
import type { ManagerClassSessionRow } from "@/types/manager-class-session";
import type {
  ManagerSessionTaskRow,
  ManagerStudentTaskRow,
} from "@/types/manager-class-session-detail";

type SessionTaskDetailsPanelProps = {
  task: ManagerSessionTaskRow;
  session: ManagerClassSessionRow;
  classRow: {
    id: string;
    name: string;
  };
  initialStudentTasks: ManagerStudentTaskRow[];
  lockedUserIds?: string[];
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
  task: initialTask,
  session,
  classRow,
  initialStudentTasks,
  lockedUserIds = [],
}: SessionTaskDetailsPanelProps) {
  const [task, setTask] = useState(initialTask);
  const [studentTasks, setStudentTasks] = useState(initialStudentTasks);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const sessionLabel = `S${session.nb_order} · ${session.topic}`;

  function handleTaskUpdated(
    nextTask: ManagerSessionTaskRow,
    options?: { gradesReset?: boolean }
  ) {
    setTask(nextTask);

    if (options?.gradesReset) {
      setStudentTasks((current) =>
        current.map((row) =>
          row.grade == null ? row : { ...row, grade: 0 }
        )
      );
    }
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
            <BreadcrumbLink href={getManagerClassDetailRoute(classRow.id)}>
              {classRow.name}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink
              href={getManagerClassSessionDetailRoute(classRow.id, session.id)}
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

      <Card className="gap-0 py-0">
        <CardHeader className="flex flex-row items-center justify-between gap-3 border-b bg-muted/50 py-3">
          <CardTitle className="text-xl">{task.title}</CardTitle>
          <Can permission={PERMISSIONS.TASKS_UPDATE}>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Edit task"
              onClick={() => setIsEditOpen(true)}
            >
              <PencilIcon />
            </Button>
          </Can>
        </CardHeader>
        <CardContent className="pt-2 pb-4">
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
                href={getManagerClassSessionDetailRoute(classRow.id, session.id)}
                className="text-primary underline-offset-4 hover:underline"
              >
                S{session.nb_order} · {session.topic}
              </Link>
            </DetailField>
            <DetailField label="Class">
              <Link
                href={getManagerClassDetailRoute(classRow.id)}
                className="text-primary underline-offset-4 hover:underline"
              >
                {classRow.name}
              </Link>
            </DetailField>
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
        task={task}
        studentTasks={studentTasks}
        onStudentTasksChange={setStudentTasks}
        lockedUserIds={lockedUserIds}
      />

      <SessionTaskAnalyticsSection
        studentTasks={studentTasks}
        maxGrade={task.max_grade}
      />

      <EditSessionTaskDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        task={task}
        classId={classRow.id}
        sessionId={session.id}
        sessionLabel={sessionLabel}
        onTaskUpdated={handleTaskUpdated}
      />
    </div>
  );
}
