"use client";

import { useState } from "react";
import { format } from "date-fns";
import { PencilIcon } from "lucide-react";
import { EditStudentDialog } from "@/components/manager/students/edit-student-dialog";
import { StudentDetailsSectionNav } from "@/components/manager/students/student-details-section-nav";
import { StudentBorrowedEquipmentSection } from "@/components/manager/students/student-borrowed-equipment-section";
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
import { getManagerStudentPreview } from "@/lib/manager/get-manager-student-preview";
import { getManagerStudentStatsPreview } from "@/lib/manager/get-manager-student-stats-preview";
import { ROUTES } from "@/lib/constants/routes";
import { STUDENT_DETAILS_SECTION_IDS } from "@/lib/constants/student-details-sections";
import type { ManagerStudentRow } from "@/types/manager-student";

type StudentDetailsPanelProps = {
  studentProfileId: string;
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
  studentProfileId,
}: StudentDetailsPanelProps) {
  const [student, setStudent] = useState<ManagerStudentRow>(() =>
    getManagerStudentPreview(studentProfileId)
  );
  const [isEditOpen, setIsEditOpen] = useState(false);
  const stats = getManagerStudentStatsPreview(studentProfileId);

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
        onUpdateStudent={setStudent}
      />

      <Card className="py-0">
        <CardHeader className="border-b bg-muted/40 py-4">
          <CardTitle className="text-xl">{student.full_name}</CardTitle>
          <CardAction className="self-center">
            <Button type="button" onClick={() => setIsEditOpen(true)}>
              <PencilIcon data-icon="inline-start" />
              Edit student
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="py-6">
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
        <StudentJoinedClassesSection studentProfileId={studentProfileId} />
      </div>

      <div
        id={STUDENT_DETAILS_SECTION_IDS.borrowing}
        className="scroll-mt-6"
      >
        <StudentBorrowedEquipmentSection userId={student.user_id} />
      </div>
    </div>
  );
}
