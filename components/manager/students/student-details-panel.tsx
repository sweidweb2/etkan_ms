"use client";

import { DetailField } from "@/components/manager/shared/detail-field";
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  FileTextIcon,
  KeyRoundIcon,
  LockIcon,
  PencilIcon,
} from "lucide-react";
import { Can } from "@/components/auth/can";
import { EditStudentDialog } from "@/components/manager/students/edit-student-dialog";
import { ChangeOwnPasswordDialog } from "@/components/student/change-own-password-dialog";
import { StudentDetailsSectionNav } from "@/components/manager/students/student-details-section-nav";
import { StudentJoinedClassesSection } from "@/components/manager/students/student-joined-classes-section";
import { StudentDetailStatCard } from "@/components/manager/students/student-detail-stat-card";
import { StudentStatusBadge } from "@/components/manager/students/student-status-badge";
import { PanelPageHeader } from "@/components/panels/panel-page-header";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import type { ManagerStudentClassAcademicBundle } from "@/types/manager-student-class-detail";

type StudentDetailsPanelProps = {
  student: ManagerStudentRow;
  stats?: ManagerStudentDetailStats;
  classBundles: ManagerStudentClassAcademicBundle[];
  registrationApplicationId: string | null;
  /** Streamed secondary panels (manager only). */
  borrowingSection?: ReactNode;
  activitySection?: ReactNode;
  /** Student panel: locked personal info + password change only. */
  variant?: "manager" | "self";
};


function StudentAnalyticsCards({
  stats,
}: {
  stats: ManagerStudentDetailStats;
}) {
  return (
    <div className="grid gap-4 @lg/panel:grid-cols-2 @4xl/panel:grid-cols-4">
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
  classBundles,
  registrationApplicationId,
  borrowingSection,
  activitySection,
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
        <PanelPageHeader title="My profile" />
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
        <ChangeOwnPasswordDialog
          open={isPasswordOpen}
          onOpenChange={setIsPasswordOpen}
        />
      )}

      {isSelf ? (
        <div className="grid gap-6 @xl/panel:grid-cols-2">
          <Card className="gap-0 py-0">
            <CardHeader className="border-b bg-muted/40 py-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <LockIcon className="size-4 shrink-0" aria-hidden />
                Personal information
              </CardTitle>
              <CardDescription>
                These details are managed by an administrator.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 pb-4 pt-3">
              <div className="flex gap-2 rounded-lg border bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">
                <LockIcon
                  className="mt-0.5 size-3.5 shrink-0 opacity-80"
                  aria-hidden
                />
                <p>
                  To change your name or phone number, contact an administrator.
                </p>
              </div>
              <dl className="grid gap-6 @lg/panel:grid-cols-2">
                <DetailField label="Full name" value={student.full_name} />
                <DetailField label="Phone" value={student.phone ?? "—"} />
              </dl>
            </CardContent>
          </Card>

          <Card className="gap-0 py-0">
            <CardHeader className="border-b bg-muted/40 py-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <KeyRoundIcon className="size-4 shrink-0" aria-hidden />
                Password
              </CardTitle>
              <CardDescription>
                You can update your account password at any time.
              </CardDescription>
              <CardAction className="self-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPasswordOpen(true)}
                >
                  <KeyRoundIcon data-icon="inline-start" />
                  Change password
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="pb-4 pt-3">
              <p className="text-sm text-muted-foreground">
                Use a strong password you do not reuse elsewhere. If you forgot
                your current password, contact{" "}
                <a
                  href="mailto:info@etkan.org"
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  info@etkan.org
                </a>
                .
              </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="gap-0 py-0">
          <CardHeader className="border-b bg-muted/40 py-3">
            <CardTitle className="text-xl">{student.full_name}</CardTitle>
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
          </CardHeader>
          <CardContent className="pb-4 pt-2">
            <dl className="grid gap-6 @lg/panel:grid-cols-2 @2xl/panel:grid-cols-3">
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
                value={format(
                  new Date(student.created_at),
                  "MMM d, yyyy 'at' h:mm a"
                )}
              />
              <DetailField label="User ID" value={student.user_id} />
              <DetailField
                label="Student profile ID"
                value={student.student_profile_id}
              />
            </dl>
          </CardContent>
        </Card>
      )}

      {!isSelf && stats ? <StudentAnalyticsCards stats={stats} /> : null}

      {isSelf ? null : (
        <div
          id={STUDENT_DETAILS_SECTION_IDS.classes}
          className="scroll-mt-6"
        >
          <StudentJoinedClassesSection
            studentProfileId={student.student_profile_id}
            studentUserId={student.user_id}
            initialClasses={classBundles.map((bundle) => bundle.classRow)}
            classBundles={classBundles}
          />
        </div>
      )}

      {isSelf ? null : (
        <div
          id={STUDENT_DETAILS_SECTION_IDS.borrowing}
          className="scroll-mt-6"
        >
          {borrowingSection}
        </div>
      )}

      {!isSelf ? (
        <div
          id={STUDENT_DETAILS_SECTION_IDS.activity}
          className="scroll-mt-6"
        >
          {activitySection}
        </div>
      ) : null}
    </div>
  );
}
