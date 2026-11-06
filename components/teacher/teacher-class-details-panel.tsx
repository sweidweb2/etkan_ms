"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { format } from "date-fns";
import {
  CalendarDaysIcon,
  ChartColumnIcon,
  ClipboardListIcon,
  LayoutDashboardIcon,
  MousePointerClickIcon,
  RefreshCwIcon,
} from "lucide-react";
import {
  loadTeacherClassSessionDetailAction,
  type TeacherClassSessionInlineDetail,
} from "@/app/teacher/classes/actions";
import { useHasMounted } from "@/hooks/use-has-mounted";
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
import { ClassSessionDetailsPanel } from "@/components/manager/classes/class-session-details-panel";
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
import { showErrorToast } from "@/lib/toast";
import {
  CLASS_STATUS_BADGE_CLASSES,
  CLASS_STATUS_LABELS,
} from "@/lib/constants/manager-subject-display";
import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  getTeacherClassDetailRoute,
  getTeacherClassTaskDetailRoute,
  ROUTES,
} from "@/lib/constants/routes";
import {
  parseTeacherClassDetailTab,
  readTeacherClassDetailTab,
  TEACHER_CLASS_DETAIL_TABS,
  writeTeacherClassDetailTab,
  type TeacherClassDetailTab,
} from "@/lib/constants/teacher-class-detail-tabs";
import { cn } from "@/lib/utils";
import {
  getSessionTimingLabel,
  sortClassSessionsNewestFirst,
  type ManagerClassSessionRow,
} from "@/types/manager-class-session";
import type { ManagerClassTaskRow } from "@/types/manager-class-session-detail";
import type { ClassStudentRow } from "@/types/class-student";
import type { TeacherClassDetailRow } from "@/types/class-teaching";
import type { ClassWeekSkipState } from "@/types/manager-class-week-skip";

type TeacherClassDetailsPanelProps = {
  classRow: TeacherClassDetailRow;
  initialSessions: ManagerClassSessionRow[];
  initialWeekSkipState: ClassWeekSkipState;
  initialTasks: ManagerClassTaskRow[];
  initialStudents?: ClassStudentRow[];
  hasComputedGrades?: boolean;
  lockedUserIds?: string[];
  assignedAt: string | null;
  /**
   * Deferred RSC grade-summary shared by Tasks + Analytics tabs.
   * Pass one element from the page so the server fetches once.
   */
  gradeSummarySlot?: ReactNode;
  /** @deprecated Prefer `gradeSummarySlot` (single shared tree). */
  tasksGradeSummarySlot?: ReactNode;
  /** @deprecated Prefer `gradeSummarySlot` (single shared tree). */
  analyticsGradeSummarySlot?: ReactNode;
};

const TABS = TEACHER_CLASS_DETAIL_TABS;

/** Browser-only: legacy `?tab=` wins, then localStorage, else main. */
function resolveTeacherClassDetailTab(classId: string): TeacherClassDetailTab {
  if (typeof window === "undefined") {
    return TABS.MAIN;
  }

  const params = new URLSearchParams(window.location.search);
  const fromLegacyUrl = parseTeacherClassDetailTab(params.get("tab"));
  if (fromLegacyUrl) {
    return fromLegacyUrl;
  }

  return readTeacherClassDetailTab(classId) ?? TABS.MAIN;
}

const CLASS_TABS = [
  { value: TABS.MAIN, label: "Main", icon: LayoutDashboardIcon },
  { value: TABS.SESSIONS, label: "Sessions", icon: CalendarDaysIcon },
  { value: TABS.TASKS, label: "Tasks", icon: ClipboardListIcon },
  { value: TABS.ANALYTICS, label: "Analytics", icon: ChartColumnIcon },
] as const;

const TAB_TRIGGER_CLASS =
  "inline-flex items-center justify-center gap-1.5 rounded-md border border-transparent px-3 py-1.5 text-center text-sm font-medium whitespace-nowrap text-muted-foreground outline-none transition-colors duration-150 hover:bg-primary/6 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=active]:border-primary/20 data-[state=active]:bg-primary/12 data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:hover:bg-primary/12 data-[state=active]:hover:text-primary";

export function TeacherClassDetailsPanel({
  classRow: initialClassRow,
  initialSessions,
  initialWeekSkipState,
  initialTasks,
  initialStudents = [],
  hasComputedGrades = false,
  lockedUserIds = [],
  assignedAt,
  gradeSummarySlot = null,
  tasksGradeSummarySlot = null,
  analyticsGradeSummarySlot = null,
}: TeacherClassDetailsPanelProps) {
  const sharedGradeSummarySlot =
    gradeSummarySlot ?? tasksGradeSummarySlot ?? analyticsGradeSummarySlot;
  // Client-only tabs (localStorage). Avoid `?tab=` / router.replace — that
  // re-runs the full class RSC on every switch.
  const hasMounted = useHasMounted();
  const [tab, setTab] = useState<TeacherClassDetailTab>(TABS.MAIN);
  const [visitedTabs, setVisitedTabs] = useState(
    () => new Set<TeacherClassDetailTab>([TABS.MAIN])
  );
  const [hydratedClassId, setHydratedClassId] = useState<string | null>(null);
  const [classRow, setClassRow] = useState(initialClassRow);

  // Restore tab from URL/localStorage after mount (or when class changes).
  // Adjust during render — avoids setState-in-effect cascading renders.
  if (hasMounted && hydratedClassId !== classRow.id) {
    const next = resolveTeacherClassDetailTab(classRow.id);
    setHydratedClassId(classRow.id);
    setTab(next);
    setVisitedTabs(new Set<TeacherClassDetailTab>([TABS.MAIN, next]));
  }

  // Drop stale `?tab=` bookmarks without App Router navigation (external URL only).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromLegacyUrl = parseTeacherClassDetailTab(params.get("tab"));
    if (!fromLegacyUrl || !params.has("tab")) {
      return;
    }

    writeTeacherClassDetailTab(classRow.id, fromLegacyUrl);
    params.delete("tab");
    const query = params.toString();
    const nextUrl = query
      ? `${window.location.pathname}?${query}`
      : window.location.pathname;
    window.history.replaceState(window.history.state, "", nextUrl);
  }, [classRow.id]);

  if (!visitedTabs.has(tab)) {
    const next = new Set(visitedTabs);
    next.add(tab);
    setVisitedTabs(next);
  }

  const [sessions, setSessions] = useState(() =>
    sortClassSessionsNewestFirst(initialSessions)
  );
  const [weekSkipState, setWeekSkipState] = useState(initialWeekSkipState);
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

  function handleSessionsChange(nextSessions: ManagerClassSessionRow[]) {
    setSessions(nextSessions);
    if (
      selectedSessionId &&
      !nextSessions.some((session) => session.id === selectedSessionId)
    ) {
      handleCloseSessionDetail();
    }
  }

  function handleTabChange(nextTab: string) {
    const parsed = parseTeacherClassDetailTab(nextTab) ?? TABS.MAIN;
    writeTeacherClassDetailTab(classRow.id, parsed);
    setTab(parsed);
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
          onClassUpdated={(updated) =>
            setClassRow((prev) => ({
              ...prev,
              id: updated.id,
              name: updated.name,
              status: updated.status,
              subject_name: updated.subject_name || prev.subject_name,
              semester_name: updated.semester_name ?? prev.semester_name,
              enrollment_count: updated.enrollment_count,
              image_url: updated.image_url,
              card_gradient: updated.card_gradient || prev.card_gradient,
            }))
          }
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

      <Tabs value={tab} onValueChange={handleTabChange} className="gap-4">
        <TabsListPrimitive className="grid w-full grid-cols-4 gap-1 self-start rounded-lg border border-border/70 bg-secondary/80 p-1 sm:w-fit sm:min-w-[24rem]">
          {CLASS_TABS.map((item) => {
            const Icon = item.icon;
            return (
              <TabsTriggerPrimitive
                key={item.value}
                value={item.value}
                className={TAB_TRIGGER_CLASS}
              >
                <Icon data-icon="inline-start" />
                {item.label}
              </TabsTriggerPrimitive>
            );
          })}
        </TabsListPrimitive>

        <TabsContents>
          <TabsContent value={TABS.MAIN} className="flex flex-col gap-4">
            {visitedTabs.has(TABS.MAIN) ? (
              <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Card className="gap-0 border-border/70 bg-card py-0 shadow-[0_10px_28px_-24px_rgba(62,62,117,0.18)]">
                <CardHeader className="border-b border-border/50 bg-muted/25 px-5 py-4">
                  <CardTitle className="text-base">Class</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 px-5 py-5 text-sm">
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

              <Card className="gap-0 border-border/70 bg-card py-0 shadow-[0_10px_28px_-24px_rgba(62,62,117,0.18)]">
                <CardHeader className="border-b border-border/50 bg-muted/25 px-5 py-4">
                  <CardTitle className="text-base">Semester</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 px-5 py-5 text-sm">
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

              <Card className="gap-0 border-border/70 bg-card py-0 shadow-[0_10px_28px_-24px_rgba(62,62,117,0.18)]">
                <CardHeader className="border-b border-border/50 bg-muted/25 px-5 py-4">
                  <CardTitle className="text-base">Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 px-5 py-5 text-sm">
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
              classId={classRow.id}
              className={classRow.name}
              students={initialStudents}
            />
              </>
            ) : null}
          </TabsContent>

          <TabsContent value={TABS.SESSIONS} className="flex flex-col gap-4">
            {visitedTabs.has(TABS.SESSIONS) ? (
              <>
                <ClassSessionsSection
                  classId={classRow.id}
                  className={classRow.name}
                  sessions={sessions}
                  onSessionsChange={handleSessionsChange}
                  weekSkipState={weekSkipState}
                  onWeekSkipStateChange={setWeekSkipState}
                  onClassUpdated={() => {
                    // Manager path refreshes list counts; teacher derives
                    // counts from local sessions/tasks state.
                  }}
                  hasComputedGrades={hasComputedGrades}
                  selectedSessionId={selectedSessionId}
                  onSessionSelect={handleSessionSelect}
                  collapsible={false}
                />

                {selectedSessionId ? (
                  <div className="flex flex-col gap-3">
                    {sessionDetail &&
                    sessionDetail.session.id === selectedSessionId ? (
                      <ClassSessionDetailsPanel
                        key={sessionDetail.session.id}
                        session={sessionDetail.session}
                        classRow={{ id: classRow.id, name: classRow.name }}
                        initialAttendees={sessionDetail.attendees}
                        hasComputedGrades={hasComputedGrades}
                        lockedUserIds={lockedUserIds}
                        navigation={{
                          classesListHref: ROUTES.TEACHER_CLASSES,
                          classesListLabel: "My classes",
                          classDetailHref: getTeacherClassDetailRoute(
                            classRow.id,
                            "sessions"
                          ),
                        }}
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
                ) : sessions.length > 0 ? (
                  <div
                    role="status"
                    className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-border/80 bg-card/70 px-6 py-16 text-center"
                  >
                    <div
                      className="relative flex size-[4.5rem] items-center justify-center"
                      aria-hidden
                    >
                      <div className="absolute inset-1 rounded-xl border border-border/70 bg-muted/50 shadow-sm" />
                      <div className="absolute inset-x-3.5 top-3.5 h-1.5 rounded-full bg-muted-foreground/20" />
                      <div className="absolute inset-x-3.5 top-6.5 h-1.5 w-[45%] rounded-full bg-muted-foreground/12" />
                      <span className="absolute right-0.5 bottom-0.5 size-9 animate-ping rounded-full bg-primary/15" />
                      <MousePointerClickIcon className="relative z-10 mt-5 ml-7 size-8 text-primary drop-shadow-sm" />
                    </div>
                    <p className="max-w-[18rem] text-sm text-muted-foreground">
                      Click on a session to see details!
                    </p>
                  </div>
                ) : null}
              </>
            ) : null}
          </TabsContent>

          <TabsContent value={TABS.TASKS} className="flex flex-col gap-4">
            {visitedTabs.has(TABS.TASKS) ? (
              <>
                {tab === TABS.TASKS &&
                taskAnalyticsHydrated &&
                taskAnalyticsEnabled
                  ? sharedGradeSummarySlot
                  : null}

                <ClassTasksSection
                  classId={classRow.id}
                  className={classRow.name}
                  tasks={initialTasks}
                  hasSubject={classRow.has_subject}
                  hasComputedGrades={hasComputedGrades}
                  layout="cards"
                  getTaskDetailHref={(taskId) =>
                    getTeacherClassTaskDetailRoute(classRow.id, taskId)
                  }
                />
              </>
            ) : null}
          </TabsContent>

          <TabsContent value={TABS.ANALYTICS} className="flex flex-col gap-4">
            {visitedTabs.has(TABS.ANALYTICS) && tab === TABS.ANALYTICS
              ? sharedGradeSummarySlot
              : null}
          </TabsContent>
        </TabsContents>
      </Tabs>
    </div>
  );
}
