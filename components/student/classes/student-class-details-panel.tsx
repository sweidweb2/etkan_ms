"use client";

import { format } from "date-fns";
import {
  CalendarIcon,
  ClipboardListIcon,
  FileIcon,
  GraduationCapIcon,
} from "lucide-react";
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
import {
  Tabs,
  TabsContent,
  TabsContents,
} from "@/components/animate-ui/components/animate/tabs";
import {
  TabsList as TabsListPrimitive,
  TabsTrigger as TabsTriggerPrimitive,
} from "@/components/animate-ui/primitives/animate/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MANAGER_CLASS_STATUS_LABELS } from "@/lib/constants/manager-class-display";
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
import { formatTaskGrade } from "@/lib/format/format-task-grade";
import { cn } from "@/lib/utils";
import type { ManagerStudentClassRow } from "@/types/manager-student-class";
import type { ManagerStudentClassTabDetail } from "@/types/manager-student-class-detail";
import type {
  ManagerClassFinalExamRow,
  ManagerStudentFinalExamGradeRow,
} from "@/types/manager-class-final-exam";

type StudentClassDetailsPanelProps = {
  classRow: ManagerStudentClassRow;
  sessions: ManagerClassSessionRow[];
  detail: ManagerStudentClassTabDetail;
  finalExam: ManagerClassFinalExamRow | null;
  studentFinalExamGrade: ManagerStudentFinalExamGradeRow | null;
};

const TASK_ROW_CLASS =
  "cursor-pointer transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none";

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

export function StudentClassDetailsPanel({
  classRow,
  sessions,
  detail,
  finalExam,
  studentFinalExamGrade,
}: StudentClassDetailsPanelProps) {
  const [tab, setTab] = useState("details");

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

  const classTabs = [
    { value: "details", label: "Details" },
    { value: "grades", label: "Grades & final exam" },
    { value: "tasks", label: "Tasks" },
  ] as const;

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

      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold">{classRow.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {classRow.subject_name}
          </p>
        </div>
        <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <div>
            <dt className="text-muted-foreground">Status</dt>
            <dd className="mt-0.5 font-medium">
              {MANAGER_CLASS_STATUS_LABELS[classRow.class_status]}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Joined</dt>
            <dd className="mt-0.5 font-medium">
              {format(new Date(classRow.joined_at), "MMM d, yyyy")}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Sessions</dt>
            <dd className="mt-0.5 font-medium tabular-nums">{sessions.length}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Completed</dt>
            <dd className="mt-0.5 font-medium tabular-nums">
              {
                sessions.filter(
                  (session) => getSessionTimingLabel(session) === "completed"
                ).length
              }
            </dd>
          </div>
        </dl>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="gap-4">
        <TabsListPrimitive className="grid w-full grid-cols-2 gap-1 self-start rounded-lg bg-muted p-1 sm:grid-cols-3 md:w-1/2">
          {classTabs.map((item) => (
            <TabsTriggerPrimitive
              key={item.value}
              value={item.value}
              className="rounded-md px-2 py-1.5 text-center text-sm font-medium whitespace-normal text-muted-foreground outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=active]:bg-background data-[state=active]:text-foreground"
            >
              {item.label}
            </TabsTriggerPrimitive>
          ))}
        </TabsListPrimitive>

        <TabsContents>
          <TabsContent value="details" className="grid items-start gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold">Sessions</h3>
              {sessions.length === 0 ? (
                <EmptyState
                  size="sm"
                  icon={CalendarIcon}
                  title="No sessions yet"
                  description="No sessions scheduled for this class yet."
                />
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {sessions.map((session) => {
                    const timing = getSessionTimingLabel(session);
                    return (
                      <article
                        key={session.id}
                        className="rounded-xl border border-border bg-card p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium text-muted-foreground">
                            Session {session.nb_order}
                          </p>
                          <span
                            className={cn(
                              "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
                              SESSION_TIMING_CLASSES[timing]
                            )}
                          >
                            {SESSION_TIMING_LABELS[timing]}
                          </span>
                        </div>
                        <h3 className="mt-2 text-sm font-semibold">
                          {session.topic}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {format(new Date(session.starts_at), "MMM d, yyyy")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(session.starts_at), "h:mm a")}
                          {" – "}
                          {format(new Date(session.ends_at), "h:mm a")}
                        </p>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold">Attendance</h3>
              {detail.attendanceSlots.length === 0 ? (
                <EmptyState
                  size="sm"
                  icon={ClipboardListIcon}
                  title="No attendance yet"
                  description="No attendance recorded for this class yet."
                />
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
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
                  <div className="h-56">
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
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="grades" className="flex flex-col gap-6">
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
                <EmptyState
                  size="sm"
                  icon={ClipboardListIcon}
                  title="No tasks yet"
                  description="No tasks found for this class yet."
                />
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
                            {formatTaskGrade({
                              grade: task.grade,
                              maxGrade: task.max_grade,
                              isYesNo: task.is_yes_no,
                            })}
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
                <EmptyState
                  size="sm"
                  className="min-h-[18rem] flex-1 justify-center"
                  icon={ClipboardListIcon}
                  title="No graded tasks yet"
                  description="Grades will appear here once tasks are graded."
                />
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
            <EmptyState
              size="sm"
              icon={FileIcon}
              title="No final exam yet"
              description="No final exam created for this class yet."
            />
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
          </TabsContent>

          <TabsContent value="tasks">
            {detail.tasks.length === 0 ? (
              <EmptyState
                size="sm"
                icon={GraduationCapIcon}
                title="No tasks yet"
                description="No tasks assigned in this class yet."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-8 px-2">Task</TableHead>
                    <TableHead className="h-8 px-2">Session</TableHead>
                    <TableHead className="h-8 px-2">Status</TableHead>
                    <TableHead className="h-8 px-2">Grade</TableHead>
                    <TableHead className="h-8 px-2">Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.tasks.map((task) => (
                    <TableRow key={task.task_id} className={TASK_ROW_CLASS}>
                      <TableCell className="px-2 py-2 font-medium whitespace-normal">
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
                      <TableCell className="px-2 py-2 text-muted-foreground">
                        {task.session_label ?? "—"}
                      </TableCell>
                      <TableCell className="px-2 py-2">
                        <StudentTaskStatusBadge status={task.status} />
                      </TableCell>
                      <TableCell className="px-2 py-2 tabular-nums">
                        {formatTaskGrade({
                          grade: task.grade,
                          maxGrade: task.max_grade,
                          isYesNo: task.is_yes_no,
                        })}
                      </TableCell>
                      <TableCell className="px-2 py-2 text-muted-foreground">
                        {task.due_date
                          ? format(new Date(task.due_date), "MMM d, yyyy")
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </TabsContents>
      </Tabs>
    </div>
  );
}
