"use client";

import { format } from "date-fns";
import { ClipboardListIcon, FileIcon, GraduationCapIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ClassLineChart } from "@/components/manager/students/class-line-chart";
import { StudentTaskStatusBadge } from "@/components/manager/students/student-task-status-badge";
import { StudentClassOverview } from "@/components/student/classes/student-class-overview";
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
import {
  getStudentClassTaskDetailRoute,
  ROUTES,
} from "@/lib/constants/routes";
import type { ManagerClassSessionRow } from "@/types/manager-class-session";
import { formatTaskGrade } from "@/lib/format/format-task-grade";
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
          <TabsContent value="details">
            <StudentClassOverview
              classRow={classRow}
              sessions={sessions}
              attendanceSlots={detail.attendanceSlots}
            />
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
