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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MANAGER_CLASS_STATUS_LABELS } from "@/lib/constants/manager-class-display";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import {
  getSessionTimingLabel,
  type ManagerClassSessionRow,
} from "@/types/manager-class-session";
import type { ManagerClassTaskRow } from "@/types/manager-class-session-detail";
import type { TeacherClassRow } from "@/types/teacher-class";

type TeacherClassDetailsPanelProps = {
  classRow: TeacherClassRow;
  sessions: ManagerClassSessionRow[];
  tasks: ManagerClassTaskRow[];
};

const SESSION_TIMING_LABELS = {
  upcoming: "Upcoming",
  in_progress: "In progress",
  completed: "Completed",
} as const;

const SESSION_TIMING_CLASSES = {
  upcoming: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  in_progress: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  completed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
} as const;

export function TeacherClassDetailsPanel({
  classRow,
  sessions,
  tasks,
}: TeacherClassDetailsPanelProps) {
  return (
    <div className="flex w-full flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={ROUTES.TEACHER_CLASSES} prefetch={false}>
              My classes
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{classRow.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">
            {classRow.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {classRow.subject_name}
          </p>
        </div>
        <span className="inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-medium">
          {MANAGER_CLASS_STATUS_LABELS[classRow.class_status]}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Class</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Subject</span>
              <span className="text-right">{classRow.subject_name}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Status</span>
              <span className="text-right">
                {MANAGER_CLASS_STATUS_LABELS[classRow.class_status]}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Assigned</span>
              <span className="text-right">
                {classRow.assigned_at
                  ? format(new Date(classRow.assigned_at), "MMM d, yyyy")
                  : "—"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sessions yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>Topic</TableHead>
                  <TableHead>Starts</TableHead>
                  <TableHead>Timing</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => {
                  const timing = getSessionTimingLabel(session);
                  return (
                    <TableRow key={session.id}>
                      <TableCell>{session.nb_order}</TableCell>
                      <TableCell className="font-medium">
                        {session.topic}
                      </TableCell>
                      <TableCell>
                        {format(new Date(session.starts_at), "MMM d, yyyy HH:mm")}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                            SESSION_TIMING_CLASSES[timing]
                          )}
                        >
                          {SESSION_TIMING_LABELS[timing]}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-24">Period</TableHead>
                  <TableHead className="w-28">Started</TableHead>
                  <TableHead>Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.title}</TableCell>
                    <TableCell>{task.period}</TableCell>
                    <TableCell>{task.started ? "Yes" : "No"}</TableCell>
                    <TableCell>
                      {task.due_date
                        ? format(new Date(task.due_date), "MMM d, yyyy")
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
