"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { format } from "date-fns";
import { LibraryIcon, LineChartIcon, PencilIcon, RefreshCwIcon } from "lucide-react";
import {
  Tabs as TabsPrimitive,
  TabsContent as TabsContentPrimitive,
  TabsContents as TabsContentsPrimitive,
  TabsList as TabsListPrimitive,
  TabsTrigger as TabsTriggerPrimitive,
} from "@/components/animate-ui/primitives/animate/tabs";
import { Can } from "@/components/auth/can";
import { DetailField } from "@/components/manager/shared/detail-field";
import { AssignClassTeachersDropdown } from "@/components/manager/classes/assign-class-teachers-dropdown";
import { ChangeClassStatusDialog } from "@/components/manager/classes/change-class-status-dialog";
import { EditClassDialog } from "@/components/manager/classes/edit-class-dialog";
import { ClassFinalExamSection } from "@/components/manager/classes/class-final-exam-section";
import { ClassSessionProgressTrack } from "@/components/manager/classes/class-session-progress-track";
import { ClassSessionsSection } from "@/components/manager/classes/class-sessions-section";
import { ClassTasksSection } from "@/components/manager/classes/class-tasks-section";
import { ClassStudentsSection } from "@/components/manager/classes/class-students-section";
import type { ClassTransferOption } from "@/components/manager/classes/transfer-student-between-classes-dialog";
import { ClassTabCollapsibleSection } from "@/components/manager/students/class-tab-collapsible-section";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useHasMounted } from "@/hooks/use-has-mounted";
import { COLLAPSIBLE_SECTION_STORAGE_KEYS } from "@/lib/constants/collapsible-section-storage";
import {
  MANAGER_CLASS_DETAIL_TABS,
  parseManagerClassDetailTab,
  readManagerClassDetailTab,
  writeManagerClassDetailTab,
  type ManagerClassDetailTab,
} from "@/lib/constants/manager-class-detail-tabs";
import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  getClassProgressTone,
  getClassSessionCompletionRate,
} from "@/lib/constants/manager-semester-class-progress";
import {
  CLASS_STATUS_BADGE_CLASSES,
  CLASS_STATUS_LABELS,
} from "@/lib/constants/manager-subject-display";
import {
  getManagerClassCategoriesRoute,
  getManagerClassGradesRoute,
  getManagerSemesterDetailRoute,
  ROUTES,
} from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import {
  CLASS_COMPUTED_GRADES_STRUCTURE_LOCKED_ERROR,
  isClassGradesUnlocked,
} from "@/lib/manager/class-grades-access";
import type {
  ManagerClassFinalExamRow,
  ManagerStudentFinalExamGradeRow,
} from "@/types/manager-class-final-exam";
import type { ManagerClassRow } from "@/types/manager-class-list";
import {
  EMPTY_CLASS_WEEK_SKIP_STATE,
  type ClassWeekSkipState,
} from "@/lib/manager/class-week-skips";
import {
  sortClassSessionsNewestFirst,
  type ManagerClassSessionRow,
} from "@/types/manager-class-session";
import type { ManagerClassStudentRow } from "@/types/manager-class-student";
import type {
  ManagerClassSemesterOption,
  ManagerClassSubjectOption,
  ManagerClassTeacherOption,
} from "@/types/manager-class-detail";
import type { ManagerClassTaskRow } from "@/types/manager-class-session-detail";
import type { ManagerStudentRow } from "@/types/manager-student";

const TAB_TRIGGER_CLASS = cn(
  "inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 sm:px-5",
  "border-transparent text-muted-foreground hover:border-border/60 hover:bg-background/80 hover:text-foreground hover:shadow-sm",
  "data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md",
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
);

type ClassDetailsPanelProps = {
  classRow: ManagerClassRow;
  initialSessions: ManagerClassSessionRow[];
  initialWeekSkipState?: ClassWeekSkipState;
  initialTasks?: ManagerClassTaskRow[];
  canViewTasks?: boolean;
  initialStudents: ManagerClassStudentRow[];
  initialAvailableStudents: ManagerStudentRow[];
  transferClassOptions: ClassTransferOption[];
  initialFinalExam: ManagerClassFinalExamRow | null;
  initialStudentGrades: ManagerStudentFinalExamGradeRow[];
  initialTeachers: ManagerClassTeacherOption[];
  subjectOptions: ManagerClassSubjectOption[];
  semesterOptions: ManagerClassSemesterOption[];
  hasComputedGrades?: boolean;
  lockedUserIds?: string[];
  /** Deferred analytics tree from the page; the Analytics tab is hidden when null. */
  analyticsSlot?: ReactNode;
};

export function ClassDetailsPanel({
  classRow: initialClassRow,
  initialSessions,
  initialWeekSkipState = EMPTY_CLASS_WEEK_SKIP_STATE,
  initialTasks = [],
  canViewTasks = false,
  initialStudents,
  initialAvailableStudents,
  transferClassOptions,
  initialFinalExam,
  initialStudentGrades,
  initialTeachers,
  subjectOptions,
  semesterOptions,
  hasComputedGrades = false,
  lockedUserIds = [],
  analyticsSlot = null,
}: ClassDetailsPanelProps) {
  const [classRow, setClassRow] = useState(initialClassRow);
  const [sessions, setSessions] = useState(() =>
    sortClassSessionsNewestFirst(initialSessions)
  );
  const [weekSkipState, setWeekSkipState] = useState(initialWeekSkipState);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isChangeStatusOpen, setIsChangeStatusOpen] = useState(false);
  const [finalExam, setFinalExam] = useState(initialFinalExam);
  const [studentGrades, setStudentGrades] = useState(initialStudentGrades);
  const [students, setStudents] = useState(initialStudents);
  const [availableStudents, setAvailableStudents] = useState(
    initialAvailableStudents
  );
  const [teachers, setTeachers] = useState(initialTeachers);
  const [activeTab, setActiveTab] = useState<ManagerClassDetailTab>(
    MANAGER_CLASS_DETAIL_TABS.SESSIONS
  );
  const [restoredTabClassId, setRestoredTabClassId] = useState<string | null>(
    null
  );
  const hasMounted = useHasMounted();
  const showProgressTab = classRow.subject_nb_sessions > 0;

  const isTabAvailable = (tab: ManagerClassDetailTab) => {
    if (tab === MANAGER_CLASS_DETAIL_TABS.TASKS) return canViewTasks;
    if (tab === MANAGER_CLASS_DETAIL_TABS.PROGRESS) return showProgressTab;
    if (tab === MANAGER_CLASS_DETAIL_TABS.ANALYTICS) return Boolean(analyticsSlot);
    return true;
  };

  // Restore after mount (localStorage is browser-only) without an effect cascade.
  if (hasMounted && restoredTabClassId !== classRow.id) {
    setRestoredTabClassId(classRow.id);
    const saved = readManagerClassDetailTab(classRow.id);
    setActiveTab(
      saved && isTabAvailable(saved) ? saved : MANAGER_CLASS_DETAIL_TABS.SESSIONS
    );
  }

  const handleTabChange = (value: string) => {
    const tab =
      parseManagerClassDetailTab(value) ?? MANAGER_CLASS_DETAIL_TABS.SESSIONS;
    writeManagerClassDetailTab(classRow.id, tab);
    setActiveTab(tab);
  };

  const sessionRate = getClassSessionCompletionRate(classRow);
  const sessionTone = getClassProgressTone(classRow);
  const gradesUnlocked = isClassGradesUnlocked(classRow.status);
  const statusLabel = CLASS_STATUS_LABELS[classRow.status] ?? classRow.status;
  const statusClassName =
    CLASS_STATUS_BADGE_CLASSES[classRow.status] ??
    "bg-muted text-muted-foreground";

  const createdText = useMemo(
    () => format(new Date(classRow.created_at), "MMM d, yyyy 'at' h:mm a"),
    [classRow.created_at]
  );

  return (
    <TooltipProvider>
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
            <BreadcrumbPage>{classRow.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {isEditOpen ? (
        <EditClassDialog
          open
          onOpenChange={setIsEditOpen}
          classRow={classRow}
          subjectOptions={subjectOptions}
          semesterOptions={semesterOptions}
          onClassUpdated={setClassRow}
        />
      ) : null}

      {isChangeStatusOpen ? (
        <ChangeClassStatusDialog
          open
          onOpenChange={setIsChangeStatusOpen}
          classRow={classRow}
          onClassUpdated={setClassRow}
        />
      ) : null}

      <TabsPrimitive
        value={activeTab}
        onValueChange={handleTabChange}
        className="mt-6 flex flex-col gap-4"
      >
        <TabsListPrimitive className="flex h-auto w-full flex-wrap items-center justify-center gap-2 self-center mb-8 rounded-full bg-muted/60 p-1.5 ring-1 ring-foreground/8 @lg/panel:w-fit">
          <TabsTriggerPrimitive value="sessions" className={TAB_TRIGGER_CLASS}>
            Sessions
          </TabsTriggerPrimitive>
          {canViewTasks ? (
            <TabsTriggerPrimitive value="tasks" className={TAB_TRIGGER_CLASS}>
              Tasks
            </TabsTriggerPrimitive>
          ) : null}
          <TabsTriggerPrimitive value="students" className={TAB_TRIGGER_CLASS}>
            Students
          </TabsTriggerPrimitive>
          <TabsTriggerPrimitive value="general" className={TAB_TRIGGER_CLASS}>
            General
          </TabsTriggerPrimitive>
          <TabsTriggerPrimitive
            value="final-exam"
            className={TAB_TRIGGER_CLASS}
          >
            Final exam
          </TabsTriggerPrimitive>
          {showProgressTab ? (
            <TabsTriggerPrimitive
              value="progress"
              className={TAB_TRIGGER_CLASS}
            >
              Session progress
            </TabsTriggerPrimitive>
          ) : null}
          {analyticsSlot ? (
            <TabsTriggerPrimitive
              value="analytics"
              className={TAB_TRIGGER_CLASS}
            >
              Analytics
            </TabsTriggerPrimitive>
          ) : null}
        </TabsListPrimitive>

        {hasComputedGrades ? (
          <div className="rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800/70 dark:bg-amber-950/30 dark:text-amber-100">
            {CLASS_COMPUTED_GRADES_STRUCTURE_LOCKED_ERROR} Creating or editing
            sessions, tasks, and final exams is disabled until computed grades
            are deleted.
          </div>
        ) : null}

        <TabsContentsPrimitive>
          <TabsContentPrimitive value="general" className="outline-none">
            <ClassTabCollapsibleSection
              title={classRow.name}
              description="Class overview, status, enrollment, and session progress."
              storageKey={COLLAPSIBLE_SECTION_STORAGE_KEYS.CLASS_DETAILS_INFO}
              collapsible={false}
              action={
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Can permission={PERMISSIONS.CLASSES_VIEW}>
                    <Button
                      type="button"
                      variant="outline"
                      nativeButton={false}
                      render={
                        <Link
                          href={getManagerClassCategoriesRoute(classRow.id)}
                          prefetch={false}
                        />
                      }
                    >
                      <LibraryIcon data-icon="inline-start" />
                      Category follow-up
                    </Button>
                  </Can>
                  {gradesUnlocked ? (
                    <Link
                      href={getManagerClassGradesRoute(classRow.id)}
                      className={cn(
                        buttonVariants({ variant: "secondary" }),
                        "border border-sky-500/20 bg-sky-500/10 text-sky-800 shadow-none hover:bg-sky-500/15 hover:text-sky-900 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-200 dark:hover:bg-sky-400/15 dark:hover:text-sky-100"
                      )}
                    >
                      <LineChartIcon data-icon="inline-start" />
                      Grades
                    </Link>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <span className="inline-flex" tabIndex={0} />
                        }
                      >
                        <Button
                          type="button"
                          variant="secondary"
                          disabled
                          className="border border-sky-500/20 bg-sky-500/10 text-sky-800 shadow-none dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-200"
                        >
                          <LineChartIcon data-icon="inline-start" />
                          Grades
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Grades are available after the class is marked Done.
                      </TooltipContent>
                    </Tooltip>
                  )}
                  <Can
                    anyOf={[
                      PERMISSIONS.CLASSES_ASSIGN_TEACHER,
                      PERMISSIONS.CLASSES_UNASSIGN_TEACHER,
                    ]}
                  >
                    <AssignClassTeachersDropdown
                      classId={classRow.id}
                      teachers={teachers}
                      onTeachersChange={setTeachers}
                      onClassUpdated={setClassRow}
                    />
                  </Can>
                  <Can permission={PERMISSIONS.CLASSES_CHANGE_STATUS}>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsChangeStatusOpen(true)}
                    >
                      <RefreshCwIcon data-icon="inline-start" />
                      Change status
                    </Button>
                  </Can>
                  <Can permission={PERMISSIONS.CLASSES_UPDATE}>
                    <Button type="button" onClick={() => setIsEditOpen(true)}>
                      <PencilIcon data-icon="inline-start" />
                      Edit class
                    </Button>
                  </Can>
                </div>
              }
            >
              <div className="px-4 pt-2 pb-4">
                <dl className="grid gap-6 @lg/panel:grid-cols-2 @2xl/panel:grid-cols-3">
                  <DetailField label="Name" value={classRow.name} />
                  <DetailField label="Status">
                    <span
                      className={cn(
                        "inline-flex w-fit rounded-md px-2 py-0.5 text-xs font-medium capitalize",
                        statusClassName
                      )}
                    >
                      {statusLabel}
                    </span>
                  </DetailField>
                  <DetailField label="Subject" value={classRow.subject_name} />
                  <DetailField
                    label="Subject ID"
                    value={classRow.subject_id || "—"}
                    className="font-mono text-xs"
                  />
                  <DetailField label="Semester">
                    {classRow.semester_id && classRow.semester_name ? (
                      <Link
                        href={getManagerSemesterDetailRoute(classRow.semester_id)}
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        {classRow.semester_name}
                      </Link>
                    ) : (
                      "Unlinked"
                    )}
                  </DetailField>
                  <DetailField
                    label="Enrollment"
                    value={String(classRow.enrollment_count)}
                    className="tabular-nums"
                  />
                  <DetailField
                    label="Teachers"
                    value={String(classRow.teacher_count)}
                    className="tabular-nums"
                  />
                  <DetailField
                    label="Session progress"
                    value={`${classRow.completed_sessions}/${classRow.subject_nb_sessions} · ${sessionRate}%`}
                    className="tabular-nums"
                  />
                  <DetailField label="Created" value={createdText} />
                </dl>

                <div className="mt-6 flex flex-col gap-1.5 border-t pt-4">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-muted-foreground">Session progress</span>
                    <span className="font-medium tabular-nums text-foreground">
                      {classRow.completed_sessions}/{classRow.subject_nb_sessions} ·{" "}
                      {sessionRate}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-[width]",
                        sessionTone.fillClassName
                      )}
                      style={{ width: `${sessionRate}%` }}
                    />
                  </div>
                </div>
              </div>
            </ClassTabCollapsibleSection>
          </TabsContentPrimitive>

          <TabsContentPrimitive value="sessions" className="outline-none">
            <ClassSessionsSection
              classId={classRow.id}
              className={classRow.name}
              sessions={sessions}
              onSessionsChange={setSessions}
              weekSkipState={weekSkipState}
              onWeekSkipStateChange={setWeekSkipState}
              onClassUpdated={setClassRow}
              hasComputedGrades={hasComputedGrades}
              collapsible={false}
            />
          </TabsContentPrimitive>

          {canViewTasks ? (
            <TabsContentPrimitive value="tasks" className="outline-none">
              <ClassTasksSection
                classId={classRow.id}
                className={classRow.name}
                tasks={initialTasks}
                hasSubject={Boolean(classRow.subject_id)}
                hasComputedGrades={hasComputedGrades}
                collapsible={false}
              />
            </TabsContentPrimitive>
          ) : null}

          <TabsContentPrimitive value="students" className="outline-none">
            <ClassStudentsSection
              classId={classRow.id}
              className={classRow.name}
              semesterId={classRow.semester_id}
              initialStudents={students}
              availableStudents={availableStudents}
              transferClassOptions={transferClassOptions}
              onStudentsChange={setStudents}
              onAvailableStudentsChange={setAvailableStudents}
              onClassUpdated={setClassRow}
              onStudentGradeAdded={(grade) => {
                setStudentGrades((current) => {
                  if (current.some((row) => row.id === grade.id)) {
                    return current;
                  }

                  return [...current, grade];
                });
              }}
              collapsible={false}
            />
          </TabsContentPrimitive>

          <TabsContentPrimitive value="final-exam" className="outline-none">
            <ClassFinalExamSection
              classId={classRow.id}
              className={classRow.name}
              finalExam={finalExam}
              studentGrades={studentGrades}
              onFinalExamChange={setFinalExam}
              onStudentGradesChange={setStudentGrades}
              hasComputedGrades={hasComputedGrades}
              lockedUserIds={lockedUserIds}
              collapsible={false}
            />
          </TabsContentPrimitive>

          {showProgressTab ? (
            <TabsContentPrimitive value="progress" className="outline-none">
              <ClassSessionProgressTrack
                classRow={classRow}
                sessions={sessions}
                collapsible={false}
              />
            </TabsContentPrimitive>
          ) : null}

          {analyticsSlot ? (
            <TabsContentPrimitive value="analytics" className="outline-none">
              {analyticsSlot}
            </TabsContentPrimitive>
          ) : null}
        </TabsContentsPrimitive>
      </TabsPrimitive>
    </div>
    </TooltipProvider>
  );
}
