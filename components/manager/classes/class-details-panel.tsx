"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { LineChartIcon, PencilIcon, RefreshCwIcon } from "lucide-react";
import { AssignClassTeachersDropdown } from "@/components/manager/classes/assign-class-teachers-dropdown";
import { ChangeClassStatusDialog } from "@/components/manager/classes/change-class-status-dialog";
import { EditClassDialog } from "@/components/manager/classes/edit-class-dialog";
import { ClassAnalyticsSection } from "@/components/manager/classes/class-analytics-section";
import { ClassFinalExamSection } from "@/components/manager/classes/class-final-exam-section";
import { ClassSessionsSection } from "@/components/manager/classes/class-sessions-section";
import { ClassStudentsSection } from "@/components/manager/classes/class-students-section";
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
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getClassSessionCompletionRate } from "@/lib/constants/manager-semester-class-progress";
import {
  CLASS_STATUS_BADGE_CLASSES,
  CLASS_STATUS_LABELS,
} from "@/lib/constants/manager-subject-display";
import {
  getManagerClassGradesRoute,
  getManagerSemesterDetailRoute,
  ROUTES,
} from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import type { ManagerClassAnalyticsPreview } from "@/types/manager-class-analytics";
import type {
  ManagerClassFinalExamRow,
  ManagerStudentFinalExamGradeRow,
} from "@/types/manager-class-final-exam";
import type { ManagerClassRow } from "@/types/manager-class-list";
import type { ManagerClassSessionRow } from "@/types/manager-class-session";
import type { ManagerClassStudentRow } from "@/types/manager-class-student";
import type {
  ManagerClassSemesterOption,
  ManagerClassSubjectOption,
  ManagerClassTeacherOption,
} from "@/types/manager-class-detail";
import type { ManagerStudentRow } from "@/types/manager-student";

type ClassDetailsPanelProps = {
  classRow: ManagerClassRow;
  initialSessions: ManagerClassSessionRow[];
  initialStudents: ManagerClassStudentRow[];
  initialAvailableStudents: ManagerStudentRow[];
  initialFinalExam: ManagerClassFinalExamRow | null;
  initialStudentGrades: ManagerStudentFinalExamGradeRow[];
  initialAnalytics: ManagerClassAnalyticsPreview;
  initialTeachers: ManagerClassTeacherOption[];
  subjectOptions: ManagerClassSubjectOption[];
  semesterOptions: ManagerClassSemesterOption[];
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

export function ClassDetailsPanel({
  classRow: initialClassRow,
  initialSessions,
  initialStudents,
  initialAvailableStudents,
  initialFinalExam,
  initialStudentGrades,
  initialAnalytics,
  initialTeachers,
  subjectOptions,
  semesterOptions,
}: ClassDetailsPanelProps) {
  const [classRow, setClassRow] = useState(initialClassRow);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isChangeStatusOpen, setIsChangeStatusOpen] = useState(false);
  const [finalExam, setFinalExam] = useState(initialFinalExam);
  const [studentGrades, setStudentGrades] = useState(initialStudentGrades);
  const [students, setStudents] = useState(initialStudents);
  const [availableStudents, setAvailableStudents] = useState(
    initialAvailableStudents
  );
  const [teachers, setTeachers] = useState(initialTeachers);

  const sessionRate = getClassSessionCompletionRate(classRow);
  const statusLabel = CLASS_STATUS_LABELS[classRow.status] ?? classRow.status;
  const statusClassName =
    CLASS_STATUS_BADGE_CLASSES[classRow.status] ??
    "bg-muted text-muted-foreground";

  const createdText = useMemo(
    () => format(new Date(classRow.created_at), "MMM d, yyyy 'at' h:mm a"),
    [classRow.created_at]
  );

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

      <Card className="gap-0 py-0">
        <CardHeader className="border-b bg-muted/50 py-3">
          <CardTitle className="text-xl">{classRow.name}</CardTitle>
          <CardAction className="flex flex-wrap items-center gap-2 self-center">
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
            <AssignClassTeachersDropdown
              classId={classRow.id}
              teachers={teachers}
              onTeachersChange={setTeachers}
              onClassUpdated={setClassRow}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsChangeStatusOpen(true)}
            >
              <RefreshCwIcon data-icon="inline-start" />
              Change status
            </Button>
            <Button type="button" onClick={() => setIsEditOpen(true)}>
              <PencilIcon data-icon="inline-start" />
              Edit class
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="pt-2 pb-4">
          <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
            <DetailField
              label="Class ID"
              value={classRow.id}
              className="font-mono text-xs"
            />
            <DetailField label="Created" value={createdText} />
          </dl>
        </CardContent>
      </Card>

      <ClassSessionsSection
        classId={classRow.id}
        className={classRow.name}
        initialSessions={initialSessions}
        onClassUpdated={setClassRow}
      />

      <ClassStudentsSection
        classId={classRow.id}
        className={classRow.name}
        initialStudents={students}
        availableStudents={availableStudents}
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
      />

      <ClassFinalExamSection
        classId={classRow.id}
        className={classRow.name}
        finalExam={finalExam}
        studentGrades={studentGrades}
        onFinalExamChange={setFinalExam}
        onStudentGradesChange={setStudentGrades}
      />

      <ClassAnalyticsSection
        className={classRow.name}
        analytics={initialAnalytics}
      />
    </div>
  );
}
