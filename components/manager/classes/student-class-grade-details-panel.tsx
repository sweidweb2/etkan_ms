"use client";

import { DetailField } from "@/components/manager/shared/detail-field";
import { format } from "date-fns";
import { ExternalLinkIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Can } from "@/components/auth/can";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import {
  ComputeFactorWeightsFields,
  type ComputeFactorWeightsValues,
} from "@/components/manager/classes/compute-factor-weights-fields";
import { StudentClassGradeSheetDemo } from "@/components/manager/classes/student-class-grade-sheet-demo";
import { StudentFastCertificateSection } from "@/components/manager/classes/student-fast-certificate-section";
import { StudentComputeAloneSection } from "@/components/manager/classes/student-compute-alone-section";
import { ClassLineChart } from "@/components/manager/students/class-line-chart";
import { ClassTabCollapsibleSection } from "@/components/manager/students/class-tab-collapsible-section";
import { StudentAttendanceStatusBadge } from "@/components/manager/students/student-attendance-status-badge";
import { StudentTaskStatusBadge } from "@/components/manager/students/student-task-status-badge";
import { Button } from "@/components/ui/button";
import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  formatGroupGradeLevelTick,
  GROUP_GRADE_LEVEL_Y_TICKS,
} from "@/lib/manager/class-group-grade-analytics";
import { buildStudentClassGradeSheetModel } from "@/lib/manager/student-class-grade-sheet";
import { DEFAULT_CLASS_GRADE_FACTOR_WEIGHTS } from "@/lib/constants/manager-class-grade-defaults";
import {
  getComputeFactorWeightFormDefaults,
  parseWeight,
  validateFactorWeights,
} from "@/lib/compute/custom-compute-form-utils";
import {
  getAttendanceDisplayKey,
  MANAGER_STUDENT_ATTENDANCE_SLOT_CLASSES,
} from "@/lib/constants/manager-student-attendance-display";
import {
  MANAGER_STUDENT_TASK_SLOTS_MAX_HEIGHT_CLASS,
} from "@/lib/constants/manager-student-class-slots";
import { SESSION_GROUP_GRADE_LEVEL_DOT_CLASSES } from "@/lib/constants/manager-session-group-grade-display";
import { MANAGER_STUDENT_TASK_SLOT_CLASSES } from "@/lib/constants/manager-student-task-display";
import {
  getManagerClassDetailRoute,
  getManagerClassGradesRoute,
  getManagerStudentDetailRoute,
  ROUTES,
} from "@/lib/constants/routes";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { ManagerClassFinalExamRow } from "@/types/manager-class-final-exam";
import type { ManagerClassRow } from "@/types/manager-class-list";
import type { ManagerClassStudentGradeRow } from "@/types/manager-class-student-grade";
import type { ManagerClassTaskForGradesRow } from "@/types/manager-class-task-for-grades";
import type { ManagerClassStudentRow } from "@/types/manager-class-student";
import type { ManagerStudentClassTabDetail } from "@/types/manager-student-class-detail";
import {
  computeStudentGradeAction,
  deleteComputedGradeAction,
} from "@/app/manager/classes/grades/actions";

type StudentClassGradeDetailBundle = {
  student: ManagerClassStudentRow;
  gradeRow: ManagerClassStudentGradeRow;
  detail: ManagerStudentClassTabDetail;
  classTasks: ManagerClassTaskForGradesRow[];
  finalExam: ManagerClassFinalExamRow | null;
};

type StudentClassGradeDetailsPanelProps = {
  classId: string;
  classRow: ManagerClassRow;
  bundle: StudentClassGradeDetailBundle | null;
};


function formatGrade(value: number | null | undefined) {
  return value === null || value === undefined ? "—" : value.toFixed(1);
}

function GroupGradesSection({ detail }: { detail: ManagerStudentClassTabDetail }) {
  const groupSlots = detail.groupGradeSlots;
  const chartData = groupSlots.map((slot) => ({
    session_label: slot.session_label,
    group_grade_index: slot.group_grade_index,
    group_grade_label: slot.group_grade_label,
  }));

  return (
    <ClassTabCollapsibleSection
      title="Group grades"
      description="Per-session group grade levels from session settings, with a combined line graph."
    >
      <div className="grid min-h-[22rem] min-w-0 gap-6 p-5 lg:grid-cols-2 lg:items-stretch">
        <div className="flex min-h-0 min-w-0 flex-col space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Group grade slots
          </p>
          {groupSlots.length === 0 ? (
            <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              No group grades recorded for this class yet. Set a group grade level
              on session settings to populate this section.
            </p>
          ) : (
            <div
              className={cn(
                "grid h-full min-h-0 flex-1 grid-cols-2 content-start gap-2.5 overflow-y-auto overscroll-y-contain sm:grid-cols-3"
              )}
            >
              {groupSlots.map((slot) => (
                <div
                  key={slot.session_id}
                  className="rounded-lg border border-violet-500/30 bg-violet-500/8 px-3 py-2"
                >
                  <p className="text-xs font-semibold">{slot.session_label}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {format(new Date(slot.session_at), "MMM d, yyyy")}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={cn(
                        "size-2 shrink-0 rounded-full",
                        SESSION_GROUP_GRADE_LEVEL_DOT_CLASSES[slot.group_grade_level]
                      )}
                    />
                    <p className="text-sm font-medium text-violet-700 dark:text-violet-300">
                      {slot.group_grade_label}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex min-h-[20rem] min-w-0 flex-col space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Group grade trend
          </p>
          {groupSlots.length === 0 ? (
            <p className="flex min-h-[18rem] flex-1 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
              No group grade trend available yet.
            </p>
          ) : (
            <ClassLineChart
              className="min-h-[18rem] flex-1"
              data={chartData}
              xKey="session_label"
              yDomain={[0, GROUP_GRADE_LEVEL_Y_TICKS.length - 1]}
              yTicks={GROUP_GRADE_LEVEL_Y_TICKS}
              yTickFormatter={formatGroupGradeLevelTick}
              yLabel="Level"
              formatTooltipSeriesValue={(_value, _seriesKey, point) =>
                String(point.group_grade_label ?? "")
              }
              series={[
                {
                  key: "group_grade_index",
                  label: "Group grade",
                  color: "#f59e0b",
                },
              ]}
            />
          )}
        </div>
      </div>
    </ClassTabCollapsibleSection>
  );
}

function TaskGradesSection({ detail }: { detail: ManagerStudentClassTabDetail }) {
  const gradeChartData = detail.taskGradeTrend.map((point) => ({
    task_label: point.task_label,
    grade: point.grade,
    max_grade: point.max_grade,
  }));

  return (
    <ClassTabCollapsibleSection
      title="Task grades"
      description="Task slots with status color theme, linked session, and grade trend."
    >
      <div className="grid min-h-[22rem] min-w-0 gap-6 p-5 lg:grid-cols-2 lg:items-stretch">
        <div className="flex min-h-0 min-w-0 flex-col space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Task slots
          </p>
          <div
            className={cn(
              "grid min-h-0 flex-1 content-start gap-2.5 overflow-y-auto overscroll-y-contain",
              MANAGER_STUDENT_TASK_SLOTS_MAX_HEIGHT_CLASS
            )}
          >
            {detail.tasks.length === 0 ? (
              <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                No tasks found for this class yet.
              </p>
            ) : (
              detail.tasks.map((task) => (
                <div
                  key={task.student_task_id}
                  className={cn(
                    "rounded-lg border px-3 py-2.5",
                    MANAGER_STUDENT_TASK_SLOT_CLASSES[task.status]
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-snug">{task.title}</p>
                    <StudentTaskStatusBadge status={task.status} />
                  </div>
                  <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    <div>
                      <dt className="inline">Session: </dt>
                      <dd className="inline text-foreground">
                        {task.session_id ?? "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="inline">Grade: </dt>
                      <dd className="inline text-foreground">
                        {task.grade === null
                          ? "Not done"
                          : `${task.grade}/${task.max_grade}`}
                      </dd>
                    </div>
                    <div>
                      <dt className="inline">Due: </dt>
                      <dd className="inline text-foreground">
                        {task.due_date
                          ? format(new Date(task.due_date), "MMM d, yyyy")
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="inline">Status: </dt>
                      <dd className="inline text-foreground">{task.status}</dd>
                    </div>
                  </dl>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex min-h-[20rem] min-w-0 flex-col space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Task grades trend
          </p>
          <ClassLineChart
            className="min-h-[18rem] flex-1"
            data={gradeChartData}
            xKey="task_label"
            yLabel="Grade"
            yDomain={[0, 100]}
            series={[
              {
                key: "grade",
                label: "Student grade",
                color: "#8b5cf6",
              },
              {
                key: "max_grade",
                label: "Max grade",
                color: "#94a3b8",
              },
            ]}
          />
        </div>
      </div>
    </ClassTabCollapsibleSection>
  );
}

function FinalExamSection({
  finalExam,
  finalExamGrade,
  finalExamWeight,
}: {
  finalExam: ManagerClassFinalExamRow | null;
  finalExamGrade: number | null;
  finalExamWeight: number | null;
}) {
  return (
    <ClassTabCollapsibleSection
      title="Final exam"
      description="Current final exam information and this student's grade result."
    >
      <div className="p-5">
        <div className="rounded-xl border bg-background">
          <div className="border-b bg-muted/40 px-4 py-3">
            <h4 className="text-sm font-semibold">
              {finalExam?.title ?? "No final exam created"}
            </h4>
            <p className="text-xs text-muted-foreground">
              {finalExam?.description ?? "No final exam description available yet."}
            </p>
          </div>
          <div className="grid gap-4 px-4 pt-2 pb-3 sm:grid-cols-2 lg:grid-cols-4">
            <DetailField
              label="Max grade"
              value={finalExam?.max_grade?.toString() ?? "—"}
            />
            <DetailField
              label="Due date"
              value={
                finalExam?.due_date
                  ? format(new Date(finalExam.due_date), "MMM d, yyyy 'at' h:mm a")
                  : "—"
              }
            />
            <DetailField
              label="Student grade"
              value={
                finalExamGrade === null
                  ? "Not graded yet"
                  : formatGrade(finalExamGrade)
              }
            />
            <DetailField
              label="Weight"
              value={
                finalExamWeight === null ? "—" : `${finalExamWeight}%`
              }
            />
          </div>
        </div>
      </div>
    </ClassTabCollapsibleSection>
  );
}

function AttendanceGradesSection({ detail }: { detail: ManagerStudentClassTabDetail }) {
  const chartData = detail.attendanceTrend.map((point) => ({
    session_label: point.session_label,
    cumulative_present: point.cumulative_present,
    cumulative_rate: point.cumulative_rate,
  }));

  return (
    <ClassTabCollapsibleSection
      title="Attendance"
      description="Attendance slots with status theme and a cumulative attendance line graph."
    >
      <div className="grid min-h-[22rem] min-w-0 gap-6 p-5 lg:grid-cols-2 lg:items-stretch">
        <div className="flex min-h-0 min-w-0 flex-col space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Attendance slots
          </p>
          <div
            className={cn(
              "grid h-full min-h-0 flex-1 grid-cols-2 content-start gap-2.5 overflow-y-auto overscroll-y-contain sm:grid-cols-3"
            )}
          >
            {detail.attendanceSlots.length === 0 ? (
              <p className="col-span-full rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                No sessions recorded for this class yet.
              </p>
            ) : (
              detail.attendanceSlots.map((slot) => (
                <div
                  key={slot.session_id}
                  className={cn(
                    "rounded-lg border px-3 py-2",
                    MANAGER_STUDENT_ATTENDANCE_SLOT_CLASSES[
                      getAttendanceDisplayKey(slot.status)
                    ]
                  )}
                >
                  <p className="text-xs font-semibold">{slot.session_label}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {format(new Date(slot.session_at), "MMM d, yyyy")}
                  </p>
                  <div className="mt-2">
                    <StudentAttendanceStatusBadge status={slot.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex min-h-[20rem] min-w-0 flex-col space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Attendance trend
          </p>
          <ClassLineChart
            className="min-h-[18rem] flex-1"
            data={chartData}
            xKey="session_label"
            yLabel="Count"
            series={[
              {
                key: "cumulative_present",
                label: "Cumulative present",
                color: "#10b981",
              },
              {
                key: "cumulative_rate",
                label: "Attendance rate %",
                color: "#0ea5e9",
              },
            ]}
          />
        </div>
      </div>
    </ClassTabCollapsibleSection>
  );
}

function clearComputedGradeFields(
  row: ManagerClassStudentGradeRow
): ManagerClassStudentGradeRow {
  return {
    ...row,
    is_computed: false,
    total_grade: null,
    task_total_grade: null,
    final_exam_grade: null,
    course_grade_id: null,
    compute_type: null,
    stored_tasks_weight: null,
    stored_final_exam_weight: null,
    stored_task_weights: null,
  };
}

export function StudentClassGradeDetailsPanel({
  classId,
  classRow,
  bundle: initialBundle,
}: StudentClassGradeDetailsPanelProps) {
  const [bundle, setBundle] = useState(initialBundle);
  const [prevBundle, setPrevBundle] = useState(initialBundle);
  const [isComputeDialogOpen, setIsComputeDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isComputing, setIsComputing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [computeWeights, setComputeWeights] = useState<ComputeFactorWeightsValues>(
    () =>
      getComputeFactorWeightFormDefaults({
        default_tasks_weight: DEFAULT_CLASS_GRADE_FACTOR_WEIGHTS.tasks_weight,
        default_final_exam_weight:
          DEFAULT_CLASS_GRADE_FACTOR_WEIGHTS.final_exam_weight,
      })
  );
  const [computeWeightError, setComputeWeightError] = useState<string | null>(null);

  if (initialBundle !== prevBundle) {
    setPrevBundle(initialBundle);
    setBundle(initialBundle);
  }

  const computeFactorTotal = useMemo(
    () =>
      parseWeight(computeWeights.tasks_weight) +
      parseWeight(computeWeights.final_exam_weight),
    [computeWeights.final_exam_weight, computeWeights.tasks_weight]
  );
  const isComputeWeightTotalValid = Math.abs(computeFactorTotal - 100) <= 0.001;

  function openComputeDialog() {
    if (!bundle) {
      return;
    }

    setComputeWeights(
      getComputeFactorWeightFormDefaults({
        stored_tasks_weight: bundle.gradeRow.stored_tasks_weight,
        stored_final_exam_weight: bundle.gradeRow.stored_final_exam_weight,
        default_tasks_weight: DEFAULT_CLASS_GRADE_FACTOR_WEIGHTS.tasks_weight,
        default_final_exam_weight:
          DEFAULT_CLASS_GRADE_FACTOR_WEIGHTS.final_exam_weight,
      })
    );
    setComputeWeightError(null);
    setIsComputeDialogOpen(true);
  }

  if (!bundle) {
    return (
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
              <BreadcrumbLink href={getManagerClassDetailRoute(classId)}>
                {classRow.name}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href={getManagerClassGradesRoute(classId)}>
                Grades
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Student grades</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Card className="gap-0 py-0">
          <CardHeader className="border-b bg-muted/50 py-3">
            <CardTitle className="text-xl">Student not found</CardTitle>
          </CardHeader>
          <CardContent className="py-10 text-sm text-muted-foreground">
            This student is not enrolled in the selected class.
          </CardContent>
        </Card>
      </div>
    );
  }

  const { student, gradeRow, detail, classTasks, finalExam } = bundle;
  const finalExamGrade =
    gradeRow.final_exam_grade ?? detail.courseGrade?.final_exam_grade ?? null;
  const finalExamWeight =
    detail.courseGrade?.final_exam_weight ??
    gradeRow.stored_final_exam_weight ??
    null;
  const hasComputedGrade = gradeRow.is_computed;

  async function handleConfirmCompute() {
    const validationError = validateFactorWeights({
      ...computeWeights,
      group_weight: "0",
      attendee_weight: "0",
    });

    if (validationError) {
      setComputeWeightError(validationError);
      return;
    }

    setIsComputing(true);
    setComputeWeightError(null);

    try {
      const result = await computeStudentGradeAction(
        classId,
        student.user_id,
        computeWeights
      );

      if (!result.success) {
        showErrorToast(result.error ?? "Unable to compute grade.");
        return;
      }

      showSuccessToast(
        result.message ??
          `${hasComputedGrade ? "Recomputed" : "Computed"} ${student.full_name}.`
      );
      setIsComputeDialogOpen(false);
      if (result.row) {
        setBundle((current) =>
          current ? { ...current, gradeRow: result.row! } : current
        );
      }
    } finally {
      setIsComputing(false);
    }
  }

  async function handleConfirmDelete() {
    setIsDeleting(true);

    try {
      const result = await deleteComputedGradeAction(classId, student.user_id);

      if (!result.success) {
        showErrorToast(result.error ?? "Unable to delete computed grade.");
        return;
      }

      showSuccessToast(
        result.message ?? `Deleted computed grade for ${student.full_name}.`
      );
      setIsDeleteDialogOpen(false);
      setBundle((current) =>
        current
          ? {
              ...current,
              gradeRow: clearComputedGradeFields(current.gradeRow),
            }
          : current
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Dialog
        open={isComputeDialogOpen}
        onOpenChange={(open) => {
          if (!isComputing) {
            setIsComputeDialogOpen(open);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {hasComputedGrade
                ? `Recompute ${student.full_name}`
                : `Compute ${student.full_name}`}
            </DialogTitle>
            <DialogDescription>
              {hasComputedGrade
                ? "This will replace the existing student_course_grade record using the weights below."
                : "Review this student's grade totals and set the weights to apply for this compute."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-3 rounded-xl border bg-muted/20 p-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Total grade
                </p>
                <p className="mt-1 text-sm font-medium">
                  {formatGrade(gradeRow.total_grade)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Tasks grade
                </p>
                <p className="mt-1 text-sm font-medium">
                  {formatGrade(gradeRow.task_total_grade)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Final exam grade
                </p>
                <p className="mt-1 text-sm font-medium">
                  {formatGrade(gradeRow.final_exam_grade)}
                </p>
              </div>
            </div>

            <ComputeFactorWeightsFields
              idPrefix="student-grade-detail-compute"
              values={computeWeights}
              onChange={setComputeWeights}
              error={computeWeightError}
            />
          </div>

          <DialogFooter showCloseButton>
            <Button
              type="button"
              className="bg-orange-500 text-white hover:bg-orange-500/90"
              disabled={isComputing || !isComputeWeightTotalValid}
              onClick={handleConfirmCompute}
            >
              {isComputing ? <InlineSpinner className="mr-2" /> : null}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          if (!isDeleting) {
            setIsDeleteDialogOpen(open);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete computed grade</DialogTitle>
            <DialogDescription>
              Remove the computed grade for {student.full_name}? This will move
              the student back to the pending grades list.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter showCloseButton>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={handleConfirmDelete}
            >
              {isDeleting ? <InlineSpinner className="mr-2" /> : null}
              Delete grade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={ROUTES.MANAGER_CLASSES}>
              Manage classes
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={getManagerClassDetailRoute(classId)}>
              {classRow.name}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={getManagerClassGradesRoute(classId)}>
              Grades
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{student.full_name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {student.full_name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Course grade breakdown for this student in {classRow.name}.
          </p>
        </div>
        <Button
          render={
            <Link
              href={getManagerStudentDetailRoute(student.student_profile_id)}
            />
          }
          nativeButton={false}
          variant="outline"
        >
          <ExternalLinkIcon data-icon="inline-start" />
          View student profile
        </Button>
      </div>

      <Card className="gap-0 py-0">
        <CardHeader className="border-b bg-muted/50 py-3">
          <CardTitle className="text-xl">{student.full_name}</CardTitle>
          <CardAction className="self-center">
            <div className="flex flex-wrap justify-end gap-2">
              <Can permission={PERMISSIONS.GRADES_COMPUTE}>
                <Button
                  type="button"
                  disabled={isComputing || isDeleting}
                  onClick={() => openComputeDialog()}
                >
                  {hasComputedGrade ? "Recompute" : "Compute"}
                </Button>
              </Can>
              {hasComputedGrade ? (
                <Can permission={PERMISSIONS.GRADES_DELETE}>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={isComputing || isDeleting}
                    onClick={() => setIsDeleteDialogOpen(true)}
                  >
                    Delete grade
                  </Button>
                </Can>
              ) : null}
            </div>
          </CardAction>
          <p className="text-sm text-muted-foreground">
            Course grade breakdown for this student in {classRow.name}.
            {gradeRow.is_computed && gradeRow.total_grade != null
              ? ` Current total: ${gradeRow.total_grade.toFixed(1)}.`
              : " Grade not computed yet."}
          </p>
        </CardHeader>
        <CardContent className="py-6">
          <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <DetailField label="Full name" value={student.full_name} />
            <DetailField label="Username" value={student.username ?? "—"} />
            <DetailField label="Email" value={student.email} />
            <DetailField label="Phone" value={student.phone ?? "—"} />
            <DetailField label="Membership" value="Member" />
            <DetailField
              label="Joined class"
              value={format(new Date(student.joined_at), "MMM d, yyyy 'at' h:mm a")}
            />
            <DetailField
              label="Student profile ID"
              value={student.student_profile_id}
              className="font-mono text-xs"
            />
            <DetailField
              label="User ID"
              value={student.user_id}
              className="font-mono text-xs"
            />
            <DetailField label="Class" value={classRow.name} />
          </dl>
        </CardContent>
      </Card>

      <StudentFastCertificateSection
        classRow={classRow}
        student={student}
        gradeRow={gradeRow}
        detail={detail}
        classTasks={classTasks}
        finalExam={finalExam}
        finalExamGrade={finalExamGrade}
      />

      <StudentClassGradeSheetDemo
        isLocked={!hasComputedGrade}
        model={buildStudentClassGradeSheetModel({
          student,
          classRow,
          gradeRow,
          detail,
          finalExam,
        })}
      />

      <GroupGradesSection detail={detail} />
      <TaskGradesSection detail={detail} />
      <FinalExamSection
        finalExam={finalExam}
        finalExamGrade={finalExamGrade}
        finalExamWeight={finalExamWeight}
      />
      <AttendanceGradesSection detail={detail} />
      <StudentComputeAloneSection
        classId={classId}
        userId={student.user_id}
        studentName={student.full_name}
        classTasks={classTasks}
        onGradeComputed={(row) => {
          setBundle((current) =>
            current ? { ...current, gradeRow: row } : current
          );
        }}
      />
    </div>
  );
}
