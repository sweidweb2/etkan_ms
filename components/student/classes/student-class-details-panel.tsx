"use client";

import { format } from "date-fns";
import Link from "next/link";
import { useMemo, useState } from "react";
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
import { ClassLineChart } from "@/components/manager/students/class-line-chart";
import { StudentAttendanceStatusBadge } from "@/components/manager/students/student-attendance-status-badge";
import { StudentTaskStatusBadge } from "@/components/manager/students/student-task-status-badge";
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
  getAttendanceDisplayKey,
  MANAGER_STUDENT_ATTENDANCE_SLOT_CLASSES,
} from "@/lib/constants/manager-student-attendance-display";
import {
  getStudentClassTaskDetailRoute,
  ROUTES,
} from "@/lib/constants/routes";
import {
  getSessionTimingLabel,
  type ManagerClassSessionRow,
} from "@/types/manager-class-session";
import { cn } from "@/lib/utils";
import type { ManagerStudentClassRow } from "@/types/manager-student-class";
import type { ManagerStudentClassTabDetail } from "@/types/manager-student-class-detail";
import type {
  ManagerClassFinalExamRow,
  ManagerStudentFinalExamGradeRow,
} from "@/types/manager-class-final-exam";
import type { StudentClassmateRow } from "@/types/student-class";

type StudentClassDetailsPanelProps = {
  classRow: ManagerStudentClassRow;
  sessions: ManagerClassSessionRow[];
  detail: ManagerStudentClassTabDetail;
  classmates: StudentClassmateRow[];
  finalExam: ManagerClassFinalExamRow | null;
  studentFinalExamGrade: ManagerStudentFinalExamGradeRow | null;
};

const TASK_ROW_CLASS =
  "cursor-pointer transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none";

export function StudentClassDetailsPanel({
  classRow,
  sessions,
  detail,
  classmates,
  finalExam,
  studentFinalExamGrade,
}: StudentClassDetailsPanelProps) {
  const [selectedSessionId, setSelectedSessionId] = useState(
    sessions[0]?.id ?? ""
  );

  const selectedSession =
    sessions.find((session) => session.id === selectedSessionId) ??
    sessions[0] ??
    null;

  const sessionTasks = useMemo(() => {
    if (!selectedSession) {
      return [];
    }
    return detail.tasks.filter(
      (task) => task.session_id === selectedSession.id
    );
  }, [detail.tasks, selectedSession]);

  const sessionAttendance = useMemo(() => {
    if (!selectedSession) {
      return null;
    }
    return (
      detail.attendanceSlots.find(
        (slot) => slot.session_id === selectedSession.id
      ) ?? null
    );
  }, [detail.attendanceSlots, selectedSession]);

  const gradeChartData = detail.taskGradeTrend.map((point) => ({
    task_label: point.task_label,
    grade: point.grade,
    max_grade: point.max_grade,
  }));

  const attendanceBarData = useMemo(() => {
    let present = 0;
    let absent = 0;
    for (const slot of detail.attendanceSlots) {
      if (slot.status === true) {
        present += 1;
      } else {
        absent += 1;
      }
    }
    return [
      { label: "Present", count: present, fill: "#10b981" },
      { label: "Absent", count: absent, fill: "#f43f5e" },
    ];
  }, [detail.attendanceSlots]);

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
              MANAGER_CLASS_STATUS_BADGE_CLASSES[classRow.class_status]
            )}
          >
            {MANAGER_CLASS_STATUS_LABELS[classRow.class_status]}
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
                <div className="grid gap-4 rounded-xl border p-4 lg:grid-cols-3">
                  <div className="space-y-2 lg:col-span-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Session details
                    </p>
                    <dl className="space-y-2 text-sm">
                      <div>
                        <dt className="text-muted-foreground">Topic</dt>
                        <dd className="font-medium">{selectedSession.topic}</dd>
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
                      <div>
                        <dt className="text-muted-foreground">Timing</dt>
                        <dd className="font-medium capitalize">
                          {getSessionTimingLabel(selectedSession).replace(
                            "_",
                            " "
                          )}
                        </dd>
                      </div>
                    </dl>
                    <div className="pt-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Your attendance
                      </p>
                      <div className="mt-2">
                        {sessionAttendance ? (
                          <StudentAttendanceStatusBadge
                            status={sessionAttendance.status}
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Not recorded
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-2">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Tasks this session
                    </p>
                    {sessionTasks.length === 0 ? (
                      <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                        No tasks for this session.
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead>Task</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Grade</TableHead>
                            <TableHead>Due</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sessionTasks.map((task) => (
                            <TableRow key={task.task_id} className="hover:bg-muted/40">
                              <TableCell>
                                <Link
                                  href={getStudentClassTaskDetailRoute(
                                    classRow.class_id,
                                    task.task_id
                                  )}
                                  prefetch={false}
                                  className="font-medium underline-offset-4 hover:underline"
                                >
                                  {task.title}
                                </Link>
                              </TableCell>
                              <TableCell>
                                <StudentTaskStatusBadge status={task.status} />
                              </TableCell>
                              <TableCell className="tabular-nums">
                                {task.grade == null
                                  ? "—"
                                  : `${task.grade}/${task.max_grade}`}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {task.due_date
                                  ? format(
                                      new Date(task.due_date),
                                      "MMM d, yyyy"
                                    )
                                  : "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-3">
          <CardTitle>Grades</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid min-h-[22rem] gap-6 p-5 lg:grid-cols-2 lg:items-stretch">
            <div className="flex min-h-0 min-w-0 flex-col space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Task grades
              </p>
              {detail.tasks.length === 0 ? (
                <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                  No tasks found for this class yet.
                </p>
              ) : (
                <div className="min-h-0 flex-1 overflow-auto rounded-xl border">
                  <table className="w-full min-w-[28rem] text-left text-sm">
                    <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="px-3 py-2 font-medium">Task</th>
                        <th className="px-3 py-2 font-medium">Session</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                        <th className="px-3 py-2 font-medium">Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.tasks.map((task) => (
                        <tr
                          key={task.task_id}
                          className="border-b last:border-b-0"
                        >
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
                            {task.grade == null
                              ? "—"
                              : `${task.grade}/${task.max_grade}`}
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
              {gradeChartData.length === 0 ? (
                <p className="flex min-h-[18rem] flex-1 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                  No graded tasks yet.
                </p>
              ) : (
                <ClassLineChart
                  className="min-h-[18rem] flex-1"
                  data={gradeChartData}
                  xKey="task_label"
                  yLabel="Grade"
                  series={[
                    {
                      key: "grade",
                      label: "Your grade",
                      color: "#8b5cf6",
                    },
                    {
                      key: "max_grade",
                      label: "Max grade",
                      color: "#94a3b8",
                    },
                  ]}
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-3">
          <CardTitle>Final exam</CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          {!finalExam ? (
            <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              No final exam created for this class yet.
            </p>
          ) : (
            <div className="rounded-xl border bg-background">
              <div className="border-b bg-muted/40 px-4 py-3">
                <h4 className="text-sm font-semibold">{finalExam.title}</h4>
                <p className="text-xs text-muted-foreground">
                  {finalExam.description ?? "No description available."}
                </p>
              </div>
              <dl className="grid gap-4 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex flex-col gap-1">
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Max grade
                  </dt>
                  <dd className="text-sm font-medium tabular-nums">
                    {finalExam.max_grade?.toString() ?? "—"}
                  </dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Due date
                  </dt>
                  <dd className="text-sm font-medium">
                    {finalExam.due_date
                      ? format(
                          new Date(finalExam.due_date),
                          "MMM d, yyyy 'at' h:mm a"
                        )
                      : "—"}
                  </dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Your grade
                  </dt>
                  <dd className="text-sm font-medium tabular-nums">
                    {studentFinalExamGrade?.grade == null
                      ? "Not graded yet"
                      : studentFinalExamGrade.grade.toFixed(1)}
                  </dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Status
                  </dt>
                  <dd className="text-sm">
                    {studentFinalExamGrade ? (
                      <StudentTaskStatusBadge
                        status={studentFinalExamGrade.status}
                      />
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-3">
          <CardTitle>Classmates</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-4">Name</TableHead>
                <TableHead className="px-4">Username</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classmates.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={2}
                    className="h-20 px-4 text-center text-muted-foreground"
                  >
                    No other students in this class yet.
                  </TableCell>
                </TableRow>
              ) : (
                classmates.map((mate) => (
                  <TableRow key={`${mate.full_name}-${mate.username ?? ""}`}>
                    <TableCell className="px-4 font-medium">
                      {mate.full_name}
                    </TableCell>
                    <TableCell className="px-4 text-muted-foreground">
                      {mate.username ?? "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-3">
          <CardTitle>Attendance</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid min-h-[22rem] gap-6 p-5 lg:grid-cols-2 lg:items-stretch">
            <div className="flex min-h-0 min-w-0 flex-col space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Session slots
              </p>
              {detail.attendanceSlots.length === 0 ? (
                <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                  No sessions recorded for this class yet.
                </p>
              ) : (
                <div className="grid min-h-0 flex-1 grid-cols-2 content-start gap-2.5 overflow-y-auto sm:grid-cols-3">
                  {detail.attendanceSlots.map((slot) => (
                    <div
                      key={slot.session_id}
                      className={cn(
                        "rounded-lg border px-3 py-2",
                        MANAGER_STUDENT_ATTENDANCE_SLOT_CLASSES[
                          getAttendanceDisplayKey(slot.status)
                        ]
                      )}
                    >
                      <p className="text-xs font-semibold">
                        {slot.session_label}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {format(new Date(slot.session_at), "MMM d, yyyy")}
                      </p>
                      <div className="mt-2">
                        <StudentAttendanceStatusBadge status={slot.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex min-h-[20rem] min-w-0 flex-col space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Attendance summary
              </p>
              {detail.attendanceSlots.length === 0 ? (
                <p className="flex min-h-[18rem] flex-1 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                  No attendance data yet.
                </p>
              ) : (
                <div className="min-h-[18rem] flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={attendanceBarData}
                      margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-border"
                      />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {attendanceBarData.map((entry) => (
                          <Cell key={entry.label} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-3">
          <CardTitle>Tasks</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-4">Task</TableHead>
                <TableHead className="px-4">Session</TableHead>
                <TableHead className="px-4">Status</TableHead>
                <TableHead className="px-4">Grade</TableHead>
                <TableHead className="px-4">Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.tasks.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={5}
                    className="h-20 px-4 text-center text-muted-foreground"
                  >
                    No tasks assigned in this class yet.
                  </TableCell>
                </TableRow>
              ) : (
                detail.tasks.map((task) => (
                  <TableRow key={task.task_id} className={TASK_ROW_CLASS}>
                    <TableCell className="px-4 font-medium whitespace-normal">
                      <Link
                        href={getStudentClassTaskDetailRoute(
                          classRow.class_id,
                          task.task_id
                        )}
                        prefetch={false}
                        className="underline-offset-4 hover:underline"
                      >
                        {task.title}
                      </Link>
                    </TableCell>
                    <TableCell className="px-4 text-muted-foreground">
                      {task.session_label ?? "—"}
                    </TableCell>
                    <TableCell className="px-4">
                      <StudentTaskStatusBadge status={task.status} />
                    </TableCell>
                    <TableCell className="px-4 tabular-nums">
                      {task.grade == null
                        ? "—"
                        : `${task.grade}/${task.max_grade}`}
                    </TableCell>
                    <TableCell className="px-4 text-muted-foreground">
                      {task.due_date
                        ? format(new Date(task.due_date), "MMM d, yyyy")
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
