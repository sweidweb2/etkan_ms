"use client";

import { format } from "date-fns";
import { StudentComputeAloneSection } from "@/components/manager/classes/student-compute-alone-section";
import { ClassLineChart } from "@/components/manager/students/class-line-chart";
import { ClassTabCollapsibleSection } from "@/components/manager/students/class-tab-collapsible-section";
import { StudentAttendanceStatusBadge } from "@/components/manager/students/student-attendance-status-badge";
import { StudentTaskStatusBadge } from "@/components/manager/students/student-task-status-badge";
import { Button } from "@/components/ui/button";
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
  averageGroupGradeFromJson,
} from "@/types/manager-student-course-grade";
import { getManagerClassFinalExamPreview } from "@/lib/constants/manager-class-final-exam-mock";
import {
  getAttendanceDisplayKey,
  MANAGER_STUDENT_ATTENDANCE_SLOT_CLASSES,
} from "@/lib/constants/manager-student-attendance-display";
import {
  MANAGER_STUDENT_TASK_SLOTS_MAX_HEIGHT_CLASS,
} from "@/lib/constants/manager-student-class-slots";
import { MANAGER_STUDENT_TASK_SLOT_CLASSES } from "@/lib/constants/manager-student-task-display";
import {
  getManagerClassDetailRoute,
  getManagerClassGradesRoute,
  ROUTES,
} from "@/lib/constants/routes";
import { getManagerClassPreview } from "@/lib/manager/get-manager-class-preview";
import { getManagerClassStudentsPreview } from "@/lib/manager/get-manager-class-students-preview";
import { getManagerStudentClassDetailPreview } from "@/lib/manager/get-manager-student-class-detail-preview";
import { cn } from "@/lib/utils";
import type { ManagerStudentClassTabDetail } from "@/types/manager-student-class-detail";

type StudentClassGradeDetailsPanelProps = {
  classId: string;
  studentId: string;
};

function DetailField({
  label,
  value,
  children,
  className,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className={cn("text-sm text-foreground", className)}>
        {children ?? value ?? "—"}
      </dd>
    </div>
  );
}

function formatGrade(value: number | null | undefined) {
  return value === null || value === undefined ? "—" : value.toFixed(1);
}

function clampGrade(value: number) {
  return Math.max(0, Math.min(100, Math.round(value * 10) / 10));
}

function buildGroupGradeSlots(detail: ManagerStudentClassTabDetail) {
  const jsonEntries = detail.courseGrade?.group_grades_json ?? [];
  const baseGrade = averageGroupGradeFromJson(jsonEntries) ?? 0;

  if (jsonEntries.length > 0) {
    return jsonEntries.map((entry) => ({
      session_id: entry.session_id,
      session_label: entry.session_label ?? entry.session_id,
      session_at: detail.attendanceSlots.find(
        (slot) => slot.session_id === entry.session_id
      )?.session_at ?? "",
      grade: entry.grade,
    }));
  }

  return detail.attendanceSlots.map((slot, index) => {
    const offsetPattern = [-4, 2, 5, -1, 3, -3];
    return {
      session_id: slot.session_id,
      session_label: slot.session_label,
      session_at: slot.session_at,
      grade: clampGrade(baseGrade + offsetPattern[index % offsetPattern.length]!),
    };
  });
}

function GroupGradesSection({ detail }: { detail: ManagerStudentClassTabDetail }) {
  const groupSlots = buildGroupGradeSlots(detail);
  const chartData = groupSlots.map((slot) => ({
    session_label: slot.session_label,
    grade: slot.grade,
  }));

  return (
    <ClassTabCollapsibleSection
      title="Group grades"
      description="Per-session group-grade slots with the combined line graph."
    >
      <div className="grid min-h-[22rem] min-w-0 gap-6 p-5 lg:grid-cols-2 lg:items-stretch">
        <div className="flex min-h-0 min-w-0 flex-col space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Group grade slots
          </p>
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
                <p className="mt-2 text-sm font-medium text-violet-700 dark:text-violet-300">
                  {formatGrade(slot.grade)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex min-h-[20rem] min-w-0 flex-col space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Group grade trend
          </p>
          <ClassLineChart
            className="min-h-[18rem] flex-1"
            data={chartData}
            xKey="session_label"
            yLabel="Grade"
            yDomain={[0, 100]}
            series={[
              {
                key: "grade",
                label: "Group grade",
                color: "#8b5cf6",
              },
            ]}
          />
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
            {detail.tasks.map((task) => (
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
                      {task.grade === null ? "Not done" : `${task.grade}/${task.max_grade}`}
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
            ))}
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
  classId,
  detail,
}: {
  classId: string;
  detail: ManagerStudentClassTabDetail;
}) {
  const finalExam = getManagerClassFinalExamPreview(classId);
  const finalExamGrade = detail.courseGrade?.final_exam_grade ?? null;

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
              value={finalExamGrade === null ? "Not graded yet" : formatGrade(finalExamGrade)}
            />
            <DetailField
              label="Weight"
              value={
                detail.courseGrade?.final_exam_weight === null ||
                detail.courseGrade?.final_exam_weight === undefined
                  ? "—"
                  : `${detail.courseGrade.final_exam_weight}%`
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
            {detail.attendanceSlots.map((slot) => (
              <div
                key={slot.session_id}
                className={cn(
                  "rounded-lg border px-3 py-2",
                  MANAGER_STUDENT_ATTENDANCE_SLOT_CLASSES[getAttendanceDisplayKey(slot.status)]
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
            ))}
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

export function StudentClassGradeDetailsPanel({
  classId,
  studentId,
}: StudentClassGradeDetailsPanelProps) {
  const classRow = getManagerClassPreview(classId);
  const student =
    getManagerClassStudentsPreview(classId).find(
      (row) => row.student_profile_id === studentId
    ) ?? null;
  const detail = student
    ? getManagerStudentClassDetailPreview(student.user_id, classId)
    : null;

  if (!student) {
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
            <BreadcrumbPage>{student.full_name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card className="gap-0 py-0">
        <CardHeader className="border-b bg-muted/50 py-3">
          <CardTitle className="text-xl">{student.full_name}</CardTitle>
          <CardAction className="self-center">
            <Button type="button">Recompute</Button>
          </CardAction>
          <p className="text-sm text-muted-foreground">
            Main student info for this class-grade view. Detailed grade breakdown will be added later.
          </p>
        </CardHeader>
        <CardContent className="py-6">
          <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <DetailField label="Full name" value={student.full_name} />
            <DetailField label="Username" value={student.username ?? "—"} />
            <DetailField label="Email" value={student.email} />
            <DetailField label="Phone" value={student.phone ?? "—"} />
            <DetailField label="Enrollment status" value={student.enrollment_status} />
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

      {detail ? (
        <>
          <GroupGradesSection detail={detail} />
          <TaskGradesSection detail={detail} />
          <FinalExamSection classId={classId} detail={detail} />
          <AttendanceGradesSection detail={detail} />
          <StudentComputeAloneSection
            classId={classId}
            userId={student.user_id}
            studentName={student.full_name}
          />
        </>
      ) : null}
    </div>
  );
}
