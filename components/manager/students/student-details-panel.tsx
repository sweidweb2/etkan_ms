"use client";

import { DetailField } from "@/components/manager/shared/detail-field";
import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { FileTextIcon, KeyRoundIcon, PencilIcon } from "lucide-react";
import { Can } from "@/components/auth/can";
import { EditStudentDialog } from "@/components/manager/students/edit-student-dialog";
import { ChangeOwnPasswordDialog } from "@/components/student/change-own-password-dialog";
import { EditOwnProfileDialog } from "@/components/student/edit-own-profile-dialog";
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
import {
  getManagerRegistrationDetailRoute,
  ROUTES,
} from "@/lib/constants/routes";
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
import type { ManagerStudentBorrowEquipmentRow } from "@/types/manager-student-borrow-equipment";

type StudentDetailsPanelProps = {
  student: ManagerStudentRow;
  stats?: ManagerStudentDetailStats;
  availableClasses: ManagerClassOption[];
  classBundles: ManagerStudentClassAcademicBundle[];
  activityRows: ManagerStudentActivityRow[];
  registrationApplicationId: string | null;
  borrowRows: ManagerStudentBorrowEquipmentRow[];
  /** Student panel: same layout, mutations hidden (read-only). */
  variant?: "manager" | "self";
};


function StudentAnalyticsCards({
  stats,
}: {
  stats: ManagerStudentDetailStats;
}) {
  return (
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
  registrationApplicationId,
  borrowRows,
  variant = "manager",
}: StudentDetailsPanelProps) {
  const [student, setStudent] = useState<ManagerStudentRow>(initialStudent);
  const [prevStudent, setPrevStudent] =
    useState<ManagerStudentRow>(initialStudent);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const isSelf = variant === "self";

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
      {isSelf ? (
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your student details.
          </p>
        </div>
      ) : (
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
      )}

      {isSelf ? null : <StudentDetailsSectionNav />}

      {!isSelf ? (
        <EditStudentDialog
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          student={student}
          onStudentUpdated={(updatedStudent) => {
            setStudent(updatedStudent);
          }}
        />
      ) : (
        <>
          <EditOwnProfileDialog
            open={isEditOpen}
            onOpenChange={setIsEditOpen}
            student={student}
            onStudentUpdated={(updatedStudent) => {
              setStudent(updatedStudent);
            }}
          />
          <ChangeOwnPasswordDialog
            open={isPasswordOpen}
            onOpenChange={setIsPasswordOpen}
          />
        </>
      )}

      <Card className="gap-0 py-0">
        <CardHeader className="border-b bg-muted/40 py-3">
          <CardTitle className="text-xl">{student.full_name}</CardTitle>
          {!isSelf ? (
            <CardAction className="flex flex-wrap items-center justify-end gap-2 self-center">
              {registrationApplicationId ? (
                <Can permission={PERMISSIONS.REGISTRATIONS_VIEW}>
                  <Button
                    variant="outline"
                    nativeButton={false}
                    render={
                      <Link
                        href={getManagerRegistrationDetailRoute(
                          registrationApplicationId,
                          "student"
                        )}
                        prefetch={false}
                      />
                    }
                  >
                    <FileTextIcon data-icon="inline-start" />
                    View registration
                  </Button>
                </Can>
              ) : null}
              <Can permission={PERMISSIONS.STUDENTS_UPDATE}>
                <Button type="button" onClick={() => setIsEditOpen(true)}>
                  <PencilIcon data-icon="inline-start" />
                  Edit student
                </Button>
              </Can>
            </CardAction>
          ) : (
            <CardAction className="flex items-center gap-2 self-center">
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Edit profile"
                onClick={() => setIsEditOpen(true)}
              >
                <PencilIcon />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Change password"
                onClick={() => setIsPasswordOpen(true)}
              >
                <KeyRoundIcon />
              </Button>
            </CardAction>
          )}
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
            {!isSelf ? (
              <>
                <DetailField label="User ID" value={student.user_id} />
                <DetailField
                  label="Student profile ID"
                  value={student.student_profile_id}
                />
              </>
            ) : null}
          </dl>
        </CardContent>
      </Card>

      {!isSelf && stats ? <StudentAnalyticsCards stats={stats} /> : null}

      {isSelf ? null : (
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
      )}

      {isSelf ? null : (
        <div
          id={STUDENT_DETAILS_SECTION_IDS.borrowing}
          className="scroll-mt-6"
        >
          <StudentBorrowedEquipmentSection initialBorrows={borrowRows} />
        </div>
      )}

      {!isSelf ? (
        <div
          id={STUDENT_DETAILS_SECTION_IDS.activity}
          className="scroll-mt-6"
        >
          <StudentActivitySection rows={activityRows} />
        </div>
      ) : null}
    </div>
  );
}
