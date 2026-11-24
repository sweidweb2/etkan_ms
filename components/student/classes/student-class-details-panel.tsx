"use client";

import { format } from "date-fns";
import type { LucideIcon } from "lucide-react";
import {
  AwardIcon,
  ClipboardListIcon,
  FileIcon,
  GraduationCapIcon,
  LayoutDashboardIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ClassLineChart } from "@/components/manager/students/class-line-chart";
import { StudentTaskStatusBadge } from "@/components/manager/students/student-task-status-badge";
import { TeamLeaderTab } from "@/components/student/classes/team-leader/team-leader-tab";
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
import { useHasMounted } from "@/hooks/use-has-mounted";
import {
  parseStudentClassDetailTab,
  readStudentClassDetailTab,
  STUDENT_CLASS_DETAIL_TABS,
  writeStudentClassDetailTab,
  type StudentClassDetailTab,
} from "@/lib/constants/student-class-detail-tabs";
import {
  getStudentClassTaskDetailRoute,
  ROUTES,
} from "@/lib/constants/routes";
import type { ManagerClassSessionRow } from "@/types/manager-class-session";
import { formatTaskGrade } from "@/lib/format/format-task-grade";
import { cn } from "@/lib/utils";
import type { ManagerStudentClassRow } from "@/types/manager-student-class";
import type { ManagerStudentClassTabDetail } from "@/types/manager-student-class-detail";
import type {
  ManagerClassFinalExamRow,
  ManagerStudentFinalExamGradeRow,
} from "@/types/manager-class-final-exam";
import type { StudentTeamLeaderBundle } from "@/types/student-team-leader";

const TABS = STUDENT_CLASS_DETAIL_TABS;

type StudentClassDetailsPanelProps = {
  classRow: ManagerStudentClassRow;
  sessions: ManagerClassSessionRow[];
  detail: ManagerStudentClassTabDetail;
  finalExam: ManagerClassFinalExamRow | null;
  studentFinalExamGrade: ManagerStudentFinalExamGradeRow | null;
  teamLeader: StudentTeamLeaderBundle | null;
  currentUserId: string | null;
};

type ClassRailItem = {
  value: StudentClassDetailTab;
  label: string;
  description: string;
  icon: LucideIcon;
};

const TASK_ROW_CLASS =
  "cursor-pointer transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none";

export function StudentClassDetailsPanel({
  classRow,
  sessions,
  detail,
  finalExam,
  studentFinalExamGrade,
  teamLeader,
  currentUserId,
}: StudentClassDetailsPanelProps) {
  const hasMounted = useHasMounted();
  const [tab, setTab] = useState<StudentClassDetailTab>(TABS.DETAILS);
  const [restoredTabClassId, setRestoredTabClassId] = useState<string | null>(
    null
  );

  const isTabAvailable = (value: StudentClassDetailTab) => {
    if (value === TABS.TEAM_LEADER) {
      return Boolean(teamLeader);
    }
    return true;
  };

  // Restore after mount (localStorage is browser-only) without an effect cascade.
  if (hasMounted && restoredTabClassId !== classRow.class_id) {
    setRestoredTabClassId(classRow.class_id);
    const saved = readStudentClassDetailTab(classRow.class_id);
    setTab(saved && isTabAvailable(saved) ? saved : TABS.DETAILS);
  }

  function handleTabChange(value: string) {
    const next = parseStudentClassDetailTab(value) ?? TABS.DETAILS;
    const resolved = isTabAvailable(next) ? next : TABS.DETAILS;
    writeStudentClassDetailTab(classRow.class_id, resolved);
    setTab(resolved);
  }

  const gradeChartData = detail.taskGradeTrend.map((point) => ({
    task_label: point.task_label,
    grade: point.grade,
    max_grade: point.max_grade,
  }));

  const classTabs: ClassRailItem[] = [
    {
      value: TABS.DETAILS,
      label: "Details",
      description: "Overview & attendance",
      icon: LayoutDashboardIcon,
    },
    {
      value: TABS.GRADES,
      label: "Grades",
      description: "Scores & final exam",
      icon: AwardIcon,
    },
    {
      value: TABS.TASKS,
      label: "Tasks",
      description: "Assignments & due dates",
      icon: ClipboardListIcon,
    },
    ...(teamLeader
      ? [
          {
            value: TABS.TEAM_LEADER,
            label: "Team leader",
            description: "Lead tools & roster",
            icon: UsersIcon,
          } satisfies ClassRailItem,
        ]
      : []),
  ];

  const activeRail =
    classTabs.find((item) => item.value === tab) ?? classTabs[0];

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

      <Tabs
        value={tab}
        onValueChange={handleTabChange}
        className="flex flex-col gap-5 @lg/panel:flex-row @lg/panel:items-start"
      >
        <aside className="w-full shrink-0 @lg/panel:sticky @lg/panel:top-4 @lg/panel:w-56">
          <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_28px_-20px_rgb(42_42_82/0.28)] dark:shadow-[0_1px_2px_rgb(0_0_0/0.35),0_16px_32px_-22px_rgb(0_0_0/0.55)]">
            <div className="border-b border-border/50 bg-muted/25 px-4 py-3.5">
              <p className="text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                Class
              </p>
              <h2 className="mt-1 truncate text-sm font-semibold tracking-tight">
                {classRow.name}
              </h2>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {classRow.subject_name}
              </p>
            </div>

            <TabsListPrimitive
              aria-label="Class sections"
              className="flex w-full flex-row gap-1.5 overflow-x-auto p-2.5 @lg/panel:flex-col"
            >
              {classTabs.map((item, index) => {
                const Icon = item.icon;
                return (
                  <TabsTriggerPrimitive
                    key={item.value}
                    value={item.value}
                    className={cn(
                      "group relative flex min-w-[9.5rem] flex-1 items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition-[background-color,box-shadow,color] duration-150 @lg/panel:min-w-0 @lg/panel:w-full",
                      "outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                      "text-foreground/90 hover:bg-muted/60",
                      "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-border/70"
                    )}
                  >
                    <span
                      aria-hidden
                      className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-transparent transition-colors group-data-[state=active]:bg-primary"
                    />
                    <span
                      className={cn(
                        "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors",
                        "bg-muted group-data-[state=active]:bg-primary/12 group-data-[state=active]:text-primary"
                      )}
                    >
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium leading-snug">
                          {item.label}
                        </span>
                        <span
                          className={cn(
                            "ml-auto hidden size-5 shrink-0 items-center justify-center rounded-md text-[10px] font-semibold tabular-nums @lg/panel:inline-flex",
                            "bg-muted text-muted-foreground group-data-[state=active]:bg-primary/12 group-data-[state=active]:text-primary"
                          )}
                        >
                          {index + 1}
                        </span>
                      </span>
                      <span className="mt-0.5 hidden text-xs text-muted-foreground @lg/panel:block">
                        {item.description}
                      </span>
                    </span>
                  </TabsTriggerPrimitive>
                );
              })}
            </TabsListPrimitive>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-4 border-b border-border/50 pb-3 @lg/panel:hidden">
            <p className="text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
              {activeRail?.label}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {activeRail?.description}
            </p>
          </div>

          <TabsContents className="mx-0">
            <TabsContent value={TABS.DETAILS} className="outline-none">
              <StudentClassOverview
                classRow={classRow}
                sessions={sessions}
                attendanceSlots={detail.attendanceSlots}
              />
            </TabsContent>

            <TabsContent
              value={TABS.GRADES}
              className="flex flex-col gap-6 outline-none"
            >
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
                                <th className="px-3 py-2 font-medium">
                                  Session
                                </th>
                                <th className="px-3 py-2 font-medium">
                                  Status
                                </th>
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
                                    <span className="line-clamp-2">
                                      {task.title}
                                    </span>
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                                    {task.session_label ?? "—"}
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <StudentTaskStatusBadge
                                      status={task.status}
                                    />
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
                        <h4 className="text-sm font-semibold">
                          {finalExam.title}
                        </h4>
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

            <TabsContent value={TABS.TASKS} className="outline-none">
              {detail.tasks.length === 0 ? (
                <EmptyState
                  size="sm"
                  icon={GraduationCapIcon}
                  title="No tasks yet"
                  description="No tasks assigned in this class yet."
                />
              ) : (
                <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
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
                        <TableRow
                          key={task.task_id}
                          className={TASK_ROW_CLASS}
                        >
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
                </div>
              )}
            </TabsContent>

            {teamLeader ? (
              <TabsContent value={TABS.TEAM_LEADER} className="outline-none">
                <TeamLeaderTab
                  classId={classRow.class_id}
                  className={classRow.name}
                  currentUserId={currentUserId}
                  sessions={sessions}
                  bundle={teamLeader}
                />
              </TabsContent>
            ) : null}
          </TabsContents>
        </div>
      </Tabs>
    </div>
  );
}
