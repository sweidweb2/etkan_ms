"use client";

import { useState } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { PlusIcon } from "lucide-react";
import {
  createSessionTaskAction,
} from "@/app/teacher/classes/actions";
import { Can } from "@/components/auth/can";
import { AddSessionTaskDialog } from "@/components/manager/classes/add-session-task-dialog";
import { DetailField } from "@/components/manager/shared/detail-field";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  SESSION_TIMING_BADGE_CLASSES,
  SESSION_TIMING_LABELS,
} from "@/lib/constants/manager-class-session-display";
import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  getTeacherClassDetailRoute,
  getTeacherClassSessionTaskDetailRoute,
  ROUTES,
} from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import {
  getSessionTimingLabel,
  type ManagerClassSessionRow,
} from "@/types/manager-class-session";
import type { ManagerSessionTaskRow } from "@/types/manager-class-session-detail";

type TeacherSessionDetailsPanelProps = {
  session: ManagerClassSessionRow;
  classRow: { id: string; name: string };
  initialTasks: ManagerSessionTaskRow[];
  hasComputedGrades?: boolean;
};

export function TeacherSessionDetailsPanel({
  session,
  classRow,
  initialTasks,
  hasComputedGrades = false,
}: TeacherSessionDetailsPanelProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const timing = getSessionTimingLabel(session);
  const sessionLabel = `S${session.nb_order}`;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={ROUTES.TEACHER_CLASSES} prefetch={false}>
              My classes
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink
              href={getTeacherClassDetailRoute(classRow.id)}
              prefetch={false}
            >
              {classRow.name}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>
              {sessionLabel} · {session.topic}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <CardTitle>
              {sessionLabel} · {session.topic}
            </CardTitle>
            <span
              className={cn(
                "inline-flex rounded-md px-2 py-0.5 text-xs font-medium capitalize",
                SESSION_TIMING_BADGE_CLASSES[timing]
              )}
            >
              {SESSION_TIMING_LABELS[timing]}
            </span>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DetailField
            label="Starts"
            value={format(new Date(session.starts_at), "MMM d, yyyy h:mm a")}
          />
          <DetailField
            label="Ends"
            value={format(new Date(session.ends_at), "MMM d, yyyy h:mm a")}
          />
          <DetailField
            label="Report"
            value={session.session_report?.trim() || "—"}
          />
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b py-3">
          <CardTitle>Tasks</CardTitle>
          <Can permission={PERMISSIONS.TASKS_CREATE}>
            <Button
              type="button"
              size="sm"
              onClick={() => setIsAddOpen(true)}
              disabled={hasComputedGrades}
            >
              <PlusIcon />
              Add task
            </Button>
          </Can>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-4">Title</TableHead>
                <TableHead className="px-4">Due</TableHead>
                <TableHead className="px-4">Max grade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={3}
                    className="h-24 px-4 text-center text-muted-foreground"
                  >
                    No tasks for this session yet.
                  </TableCell>
                </TableRow>
              ) : (
                tasks.map((task) => (
                  <TableRow
                    key={task.id}
                    className="cursor-pointer transition-colors hover:bg-primary/8"
                    tabIndex={0}
                    role="link"
                    aria-label={`View task ${task.title}`}
                    onClick={() =>
                      router.push(
                        getTeacherClassSessionTaskDetailRoute(
                          classRow.id,
                          session.id,
                          task.id
                        )
                      )
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        router.push(
                          getTeacherClassSessionTaskDetailRoute(
                            classRow.id,
                            session.id,
                            task.id
                          )
                        );
                      }
                    }}
                  >
                    <TableCell className="px-4 font-medium whitespace-normal">
                      {task.title}
                    </TableCell>
                    <TableCell className="px-4 text-muted-foreground">
                      {task.due_date
                        ? format(new Date(task.due_date), "MMM d, yyyy h:mm a")
                        : "—"}
                    </TableCell>
                    <TableCell className="px-4 tabular-nums text-muted-foreground">
                      {task.max_grade ?? "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AddSessionTaskDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        classId={classRow.id}
        sessionId={session.id}
        sessionLabel={sessionLabel}
        defaultDueDate={session.ends_at}
        action={createSessionTaskAction}
        onCreateTask={(task) => {
          setTasks((current) => [task, ...current]);
        }}
      />
    </div>
  );
}
