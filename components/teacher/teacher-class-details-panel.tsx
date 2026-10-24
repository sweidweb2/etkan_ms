"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { format } from "date-fns";
import { RefreshCwIcon } from "lucide-react";
import {
  loadTeacherClassSessionDetailAction,
  type TeacherClassSessionInlineDetail,
} from "@/app/teacher/classes/actions";
import { useTeacherTaskAnalytics } from "@/hooks/use-teacher-task-analytics";
import {
  Tabs,
  TabsContent,
  TabsContents,
} from "@/components/animate-ui/components/animate/tabs";
import {
  TabsList as TabsListPrimitive,
  TabsTrigger as TabsTriggerPrimitive,
} from "@/components/animate-ui/primitives/animate/tabs";
import { Can } from "@/components/auth/can";
import { ChangeClassStatusDialog } from "@/components/manager/classes/change-class-status-dialog";
import { ClassSessionsSection } from "@/components/manager/classes/class-sessions-section";
import { ClassTasksSection } from "@/components/manager/classes/class-tasks-section";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { TeacherClassSessionDetailsPanel } from "@/components/teacher/teacher-class-session-details-panel";
import { TeacherClassStudentsSection } from "@/components/teacher/teacher-class-students-section";
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
import { SemiCircularGaugeCard } from "@/components/ui/semi-circular-gauge-card";
import { showErrorToast } from "@/lib/toast";
import type { ClassTaskGradeSummary } from "@/lib/manager/class-task-grade-summary";
import {
  CLASS_STATUS_BADGE_CLASSES,
  CLASS_STATUS_LABELS,
} from "@/lib/constants/manager-subject-display";
import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  getTeacherClassTaskDetailRoute,
  ROUTES,
} from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import {
  getSessionTimingLabel,
  sortClassSessionsNewestFirst,
  type ManagerClassSessionRow,
} from "@/types/manager-class-session";
import type { ManagerClassTaskRow } from "@/types/manager-class-session-detail";
import type { ManagerClassRow } from "@/types/manager-class-list";
import type { ManagerClassStudentRow } from "@/types/manager-class-student";

type TeacherClassDetailsPanelProps = {
  classRow: ManagerClassRow;
  initialSessions: ManagerClassSessionRow[];
  initialTasks: ManagerClassTaskRow[];
  initialStudents?: ManagerClassStudentRow[];
  hasComputedGrades?: boolean;
  assignedAt: string | null;
  taskGradeSummary?: ClassTaskGradeSummary | null;
};

const TABS = {
  MAIN: "main",
  SESSIONS: "sessions",
  TASKS: "tasks",
} as const;

const CLASS_TABS = [
  { value: TABS.MAIN, label: "Main" },
  { value: TABS.SESSIONS, label: "Sessions" },
  { value: TABS.TASKS, label: "Tasks" },
] as const;

const TAB_TRIGGER_CLASS =
  "rounded-md px-3 py-1.5 text-center text-sm font-medium whitespace-nowrap text-muted-foreground outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=active]:bg-primary/12 data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-primary/20";

export function TeacherClassDetailsPanel({
  classRow: initialClassRow,
  initialSessions,
  initialTasks,
  initialStudents = [],
  hasComputedGrades = false,
  assignedAt,
  taskGradeSummary = null,
}: TeacherClassDetailsPanelProps) {
  const [tab, setTab] = useState<string>(TABS.MAIN);
  const [classRow, setClassRow] = useState(initialClassRow);
  const [sessions, setSessions] = useState(() =>
    sortClassSessionsNewestFirst(initialSessions)
  );
  const [isChangeStatusOpen, setIsChangeStatusOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null
  );
  const [sessionDetail, setSessionDetail] =
    useState<TeacherClassSessionInlineDetail | null>(null);
  const [, startSessionDetailTransition] = useTransition();
  const sessionLoadRequestRef = useRef(0);
  const {
    enabled: taskAnalyticsEnabled,
    hasHydrated: taskAnalyticsHydrated,
  } = useTeacherTaskAnalytics();

  const completedSessions = useMemo(
    () =>
      sessions.filter(
        (session) => getSessionTimingLabel(session) === "completed"
      ).length,
    [sessions]
  );

  const statusLabel = CLASS_STATUS_LABELS[classRow.status] ?? classRow.status;
  const statusClassName =
    CLASS_STATUS_BADGE_CLASSES[classRow.status] ??
    "bg-muted text-muted-foreground";

  function handleSessionSelect(sessionId: string) {
    if (selectedSessionId === sessionId) {
      sessionLoadRequestRef.current += 1;
      setSelectedSessionId(null);
      setSessionDetail(null);
      return;
    }

    const requestId = sessionLoadRequestRef.current + 1;
    sessionLoadRequestRef.current = requestId;
    setSelectedSessionId(sessionId);
    setSessionDetail(null);
    startSessionDetailTransition(async () => {
      const detail = await loadTeacherClassSessionDetailAction(
        classRow.id,
        sessionId
      );
      if (sessionLoadRequestRef.current !== requestId) {
        return;
      }
      if (!detail) {
        showErrorToast("Unable to load this session.");
        setSelectedSessionId(null);
        setSessionDetail(null);
        return;
      }
      setSessionDetail(detail);
    });
  }

  function handleCloseSessionDetail() {
    sessionLoadRequestRef.current += 1;
    setSelectedSessionId(null);
    setSessionDetail(null);
  }

  function handleInlineSessionUpdated(session: ManagerClassSessionRow) {
    setSessions((current) =>
      sortClassSessionsNewestFirst(
        current.map((row) => (row.id === session.id ? session : row))
      )
    );
    setSessionDetail((current) =>
      current ? { ...current, session } : current
    );
  }

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

      {isChangeStatusOpen ? (
        <ChangeClassStatusDialog
          open
          onOpenChange={setIsChangeStatusOpen}
          classRow={classRow}
          onClassUpdated={setClassRow}
        />
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">
            {classRow.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {classRow.subject_name}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-medium",
              statusClassName
            )}
          >
            {statusLabel}
          </span>
          <Can permission={PERMISSIONS.CLASSES_CHANGE_STATUS}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsChangeStatusOpen(true)}
            >
              <RefreshCwIcon data-icon="inline-start" />
              Change status
            </Button>
          </Can>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="gap-4">
        <TabsListPrimitive className="grid w-full grid-cols-3 gap-1 self-start rounded-lg border border-border/70 bg-secondary/80 p-1 sm:w-fit sm:min-w-[20rem]">
          {CLASS_TABS.map((item) => (
            <TabsTriggerPrimitive
              key={item.value}
              value={item.value}
              className={TAB_TRIGGER_CLASS}
            >
              {item.label}
            </TabsTriggerPrimitive>
          ))}
        </TabsListPrimitive>

        <TabsContents>
          <TabsContent value={TABS.MAIN} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Card className="border-border/70 bg-card shadow-[0_10px_28px_-24px_rgba(62,62,117,0.18)]">
                <CardHeader className="border-b border-border/50 bg-muted/25 pb-3">
                  <CardTitle className="text-base">Class</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-4 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Subject</span>
                    <span className="text-right">{classRow.subject_name}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Status</span>
                    <span className="text-right">{statusLabel}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Assigned</span>
                    <span className="text-right">
                      {assignedAt
                        ? format(new Date(assignedAt), "MMM d, yyyy")
                        : "—"}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/70 bg-card shadow-[0_10px_28px_-24px_rgba(62,62,117,0.18)]">
                <CardHeader className="border-b border-border/50 bg-muted/25 pb-3">
                  <CardTitle className="text-base">Semester</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-4 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Linked semester</span>
                    <span className="text-right font-medium">
                      {classRow.semester_name ?? "Unlinked"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This class’s academic period for sessions and grades.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/70 bg-card shadow-[0_10px_28px_-24px_rgba(62,62,117,0.18)]">
                <CardHeader className="border-b border-border/50 bg-muted/25 pb-3">
                  <CardTitle className="text-base">Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-4 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Sessions</span>
                    <span className="tabular-nums">{sessions.length}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Completed</span>
                    <span className="tabular-nums">{completedSessions}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Tasks</span>
                    <span className="tabular-nums">{initialTasks.length}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Students</span>
                    <span className="tabular-nums">
                      {initialStudents.length || classRow.enrollment_count}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <TeacherClassStudentsSection
              className={classRow.name}
              students={initialStudents}
            />
          </TabsContent>

          <TabsContent value={TABS.SESSIONS} className="flex flex-col gap-4">
            <ClassSessionsSection
              classId={classRow.id}
              className={classRow.name}
              sessions={sessions}
              onSessionsChange={setSessions}
              onClassUpdated={setClassRow}
              hasComputedGrades={hasComputedGrades}
              selectedSessionId={selectedSessionId}
              onSessionSelect={handleSessionSelect}
            />

            {selectedSessionId ? (
              <div className="flex flex-col gap-3">
                {sessionDetail &&
                sessionDetail.session.id === selectedSessionId ? (
                  <TeacherClassSessionDetailsPanel
                    key={sessionDetail.session.id}
                    session={sessionDetail.session}
                    classRow={{ id: classRow.id, name: classRow.name }}
                    initialAttendees={sessionDetail.attendees}
                    hasComputedGrades={sessionDetail.hasComputedGrades}
                    lockedUserIds={sessionDetail.lockedUserIds}
                    embedded
                    onClose={handleCloseSessionDetail}
                    onSessionUpdated={handleInlineSessionUpdated}
                  />
                ) : (
                  <div className="flex items-center justify-center gap-2 rounded-2xl border border-border/80 bg-card px-4 py-10 text-sm text-muted-foreground">
                    <InlineSpinner />
                    Loading session…
                  </div>
                )}
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value={TABS.TASKS} className="flex flex-col gap-4">
            {taskAnalyticsHydrated &&
            taskAnalyticsEnabled &&
            taskGradeSummary ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <SemiCircularGaugeCard
                  title="Task grades"
                  titleTooltip="Class average of each student's combined task scores, compared with the maximum points across all tasks."
                  value={taskGradeSummary.averageEarned}
                  total={taskGradeSummary.totalMax}
                  progressPercent={taskGradeSummary.progressPercent}
                  valueLabel="Average"
                  legendAverageLabel="Average"
                  legendTotalLabel="Total"
                  className="sm:max-w-sm"
                />
              </div>
            ) : null}

            <ClassTasksSection
              classId={classRow.id}
              className={classRow.name}
              tasks={initialTasks}
              hasSubject={Boolean(classRow.subject_id)}
              hasComputedGrades={hasComputedGrades}
              getTaskDetailHref={(taskId) =>
                getTeacherClassTaskDetailRoute(classRow.id, taskId)
              }
            />
          </TabsContent>
        </TabsContents>
      </Tabs>
    </div>
  );
}
