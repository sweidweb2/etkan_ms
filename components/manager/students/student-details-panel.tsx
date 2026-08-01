"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { PencilIcon } from "lucide-react";
import { Can } from "@/components/auth/can";
import { EditStudentDialog } from "@/components/manager/students/edit-student-dialog";
import { StudentDetailsSectionNav } from "@/components/manager/students/student-details-section-nav";
import { StudentBorrowedEquipmentSection } from "@/components/manager/students/student-borrowed-equipment-section";
import { StudentActivitySection } from "@/components/manager/students/student-activity-section";
import { StudentJoinedClassesSection } from "@/components/manager/students/student-joined-classes-section";
import { StudentDetailStatCard } from "@/components/manager/students/student-detail-stat-card";
import { StudentStatusBadge } from "@/components/manager/students/student-status-badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { ROUTES } from "@/lib/constants/routes";
import {
  scrollToStudentDetailsSection,
  STUDENT_DETAILS_SECTION_IDS,
} from "@/lib/constants/student-details-sections";
import type {
  ManagerStudentDetailStats,
  ManagerStudentRow,
} from "@/types/manager-student";
import type { ManagerStudentActivityRow } from "@/types/manager-student-activity";
import type { ManagerClassOption } from "@/types/manager-class";
import type { ManagerStudentClassAcademicBundle } from "@/types/manager-student-class-detail";

type StudentDetailsPanelProps = {
  student: ManagerStudentRow;
  stats: ManagerStudentDetailStats;
  availableClasses: ManagerClassOption[];
  classBundles: ManagerStudentClassAcademicBundle[];
  activityRows: ManagerStudentActivityRow[];
};

function DetailField({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm text-foreground">{children ?? value ?? "—"}</dd>
    </div>
  );
}

function formatBirthDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return format(new Date(`${value}T00:00:00`), "MMM d, yyyy");
}

export function StudentDetailsPanel({
  student: initialStudent,
  stats,
  availableClasses,
  classBundles,
  activityRows,
}: StudentDetailsPanelProps) {
  const router = useRouter();
  const [student, setStudent] = useState<ManagerStudentRow>(initialStudent);
  const [prevStudent, setPrevStudent] =
    useState<ManagerStudentRow>(initialStudent);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const studentProfileId = student.student_profile_id;

  if (initialStudent !== prevStudent) {
    setPrevStudent(initialStudent);
    setStudent(initialStudent);
  }

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      scrollToStudentDetailsSection(hash);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={ROUTES.MANAGER_STUDENTS}>
              Manage students
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{student.full_name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <StudentDetailsSectionNav />

      <EditStudentDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        student={student}
        onStudentUpdated={(updatedStudent) => {
          setStudent(updatedStudent);
          router.refresh();
        }}
      />

      <Card className="gap-0 py-0">
        <CardHeader className="border-b bg-muted/40 py-3">
          <CardTitle className="text-xl">{student.full_name}</CardTitle>
          <CardAction className="self-center">
            <Can permission={PERMISSIONS.STUDENTS_UPDATE}>
              <Button type="button" onClick={() => setIsEditOpen(true)}>
                <PencilIcon data-icon="inline-start" />
                Edit student
              </Button>
            </Can>
          </CardAction>
        </CardHeader>
        <CardContent className="pb-4 pt-2">
          <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <DetailField label="Full name" value={student.full_name} />
            <DetailField label="Username" value={student.username ?? "—"} />
            <DetailField label="Email" value={student.email} />
            <DetailField label="Phone" value={student.phone ?? "—"} />
            <DetailField
              label="Birth date"
              value={formatBirthDate(student.birth_date)}
            />
            <DetailField label="Status">
              <StudentStatusBadge status={student.status} />
            </DetailField>
            <DetailField
              label="Joined"
              value={format(new Date(student.created_at), "MMM d, yyyy 'at' h:mm a")}
            />
            <DetailField label="User ID" value={student.user_id} />
            <DetailField
              label="Student profile ID"
              value={student.student_profile_id}
            />
          </dl>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StudentDetailStatCard
          label="Classes registered"
          value={stats.classesRegistered}
          accentClassName="border-l-sky-500"
        />
        <StudentDetailStatCard
          label="Classes done"
          value={stats.classesDone}
          accentClassName="border-l-emerald-500"
        />
        <StudentDetailStatCard
          label="Classes pending"
          value={stats.classesPending}
          accentClassName="border-l-amber-500"
        />
        <StudentDetailStatCard
          label="Tasks done"
          value={`${stats.tasksDone} / ${stats.tasksTotal}`}
          accentClassName="border-l-violet-500"
        />
      </div>

      <div
        id={STUDENT_DETAILS_SECTION_IDS.classes}
        className="scroll-mt-6"
      >
        <StudentJoinedClassesSection
          studentProfileId={student.student_profile_id}
          initialClasses={classBundles.map((bundle) => bundle.classRow)}
          availableClasses={availableClasses}
          classBundles={classBundles}
        />
      </div>

      <div
        id={STUDENT_DETAILS_SECTION_IDS.borrowing}
        className="scroll-mt-6"
      >
        <StudentBorrowedEquipmentSection userId={student.user_id} />
      </div>

      <div
        id={STUDENT_DETAILS_SECTION_IDS.activity}
        className="scroll-mt-6"
      >
        <StudentActivitySection rows={activityRows} />
      </div>
    </div>
  );
}
