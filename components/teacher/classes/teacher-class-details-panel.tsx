"use client";

import { format } from "date-fns";
import Link from "next/link";
import { useState } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HorizontalScrollCarousel } from "@/components/ui/horizontal-scroll-carousel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MANAGER_CLASS_STATUS_BADGE_CLASSES,
  MANAGER_CLASS_STATUS_LABELS,
} from "@/lib/constants/manager-class-display";
import {
  getTeacherClassSessionDetailRoute,
  ROUTES,
} from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import type { ManagerClassRow } from "@/types/manager-class-list";
import {
  getSessionTimingLabel,
  type ManagerClassSessionRow,
} from "@/types/manager-class-session";
import type { ManagerClassStudentRow } from "@/types/manager-class-student";

type TeacherClassDetailsPanelProps = {
  classRow: ManagerClassRow;
  sessions: ManagerClassSessionRow[];
  students: ManagerClassStudentRow[];
};

export function TeacherClassDetailsPanel({
  classRow,
  sessions,
  students,
}: TeacherClassDetailsPanelProps) {
  const [selectedSessionId, setSelectedSessionId] = useState(
    sessions[0]?.id ?? ""
  );

  const selectedSession =
    sessions.find((session) => session.id === selectedSessionId) ??
    sessions[0] ??
    null;

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
            <BreadcrumbPage>{classRow.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card>
        <CardHeader>
          <CardTitle>{classRow.name}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className="inline-flex rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground shadow-sm">
            Subject · {classRow.subject_name}
          </span>
          <span
            className={cn(
              "inline-flex rounded-md px-2 py-0.5 text-xs font-medium capitalize",
              MANAGER_CLASS_STATUS_BADGE_CLASSES[classRow.status]
            )}
          >
            {MANAGER_CLASS_STATUS_LABELS[classRow.status]}
          </span>
          {classRow.semester_name ? (
            <span className="inline-flex rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground shadow-sm">
              Semester · {classRow.semester_name}
            </span>
          ) : null}
          <span className="inline-flex rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground shadow-sm">
            Students · {classRow.enrollment_count}
          </span>
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-3">
          <CardTitle>Sessions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-4 pb-4">
          {sessions.length === 0 ? (
            <p className="px-1 text-sm text-muted-foreground">
              No sessions scheduled for this class yet.
            </p>
          ) : (
            <>
              <HorizontalScrollCarousel contentClassName="flex gap-2">
                {sessions.map((session) => {
                  const isActive = selectedSession?.id === session.id;
                  return (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => setSelectedSessionId(session.id)}
                      className={cn(
                        "shrink-0 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                        isActive
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-card text-muted-foreground hover:bg-muted/50"
                      )}
                    >
                      <p className="font-medium text-foreground">
                        S{session.nb_order} · {session.topic}
                      </p>
                      <p className="mt-0.5 text-xs">
                        {format(new Date(session.starts_at), "MMM d, yyyy")}
                      </p>
                    </button>
                  );
                })}
              </HorizontalScrollCarousel>

              {selectedSession ? (
                <div className="rounded-xl border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Session details
                    </p>
                    <Link
                      href={getTeacherClassSessionDetailRoute(
                        classRow.id,
                        selectedSession.id
                      )}
                      prefetch={false}
                      className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Open session and tasks
                    </Link>
                  </div>
                  <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <dt className="text-muted-foreground">Topic</dt>
                      <dd className="font-medium">{selectedSession.topic}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Timing</dt>
                      <dd className="font-medium capitalize">
                        {getSessionTimingLabel(selectedSession).replaceAll(
                          "_",
                          " "
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Starts</dt>
                      <dd className="font-medium">
                        {format(
                          new Date(selectedSession.starts_at),
                          "MMM d, yyyy h:mm a"
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Ends</dt>
                      <dd className="font-medium">
                        {format(
                          new Date(selectedSession.ends_at),
                          "MMM d, yyyy h:mm a"
                        )}
                      </dd>
                    </div>
                  </dl>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-3">
          <CardTitle>Students</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-4">Name</TableHead>
                <TableHead className="px-4">Username</TableHead>
                <TableHead className="px-4">Email</TableHead>
                <TableHead className="px-4">Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={4}
                    className="h-24 px-4 text-center text-muted-foreground whitespace-normal"
                  >
                    No students enrolled in this class yet.
                  </TableCell>
                </TableRow>
              ) : (
                students.map((student) => (
                  <TableRow key={student.id} className="hover:bg-transparent">
                    <TableCell className="px-4 font-medium whitespace-normal">
                      {student.full_name}
                    </TableCell>
                    <TableCell className="px-4 text-muted-foreground whitespace-normal">
                      {student.username ?? "—"}
                    </TableCell>
                    <TableCell className="px-4 text-muted-foreground whitespace-normal">
                      {student.email || "—"}
                    </TableCell>
                    <TableCell className="px-4 text-muted-foreground">
                      {student.joined_at
                        ? format(new Date(student.joined_at), "MMM d, yyyy")
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
