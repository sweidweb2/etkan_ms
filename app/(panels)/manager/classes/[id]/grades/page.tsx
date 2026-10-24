import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ClassGradesLockedSection } from "@/components/manager/classes/class-grades-locked-section";
import { ClassStudentGradesSection } from "@/components/manager/classes/class-student-grades-section";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { getSessionUser } from "@/lib/auth/session";
import { getManagerClassDetailRoute, ROUTES } from "@/lib/constants/routes";
import { isClassGradesUnlocked } from "@/lib/manager/class-grades-access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getClassForManager } from "@/services/classes/class.service";
import { loadClassGradesPageData } from "@/services/classes/student-course-grade.service";
import type { ManagerClassRow } from "@/types/manager-class-list";

type ManagerClassGradesPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ManagerClassGradesPage({
  params,
}: ManagerClassGradesPageProps) {
  const { id } = await params;
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const actorUserId = user?.id ?? null;

  const classRow = await getClassForManager(adminClient, actorUserId, id);

  if (!classRow) {
    notFound();
  }

  const gradesUnlocked = isClassGradesUnlocked(classRow.status);

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
            <BreadcrumbLink href={getManagerClassDetailRoute(id)}>
              {classRow.name}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Grades</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {gradesUnlocked ? (
        <Suspense fallback={<ClassGradesBodyFallback />}>
          <ManagerClassGradesContent
            classId={id}
            actorUserId={actorUserId}
            classRow={classRow}
          />
        </Suspense>
      ) : (
        <ClassGradesLockedSection status={classRow.status} />
      )}
    </div>
  );
}

function ClassGradesBodyFallback() {
  return (
    <div
      className="min-h-[16rem] animate-pulse rounded-xl bg-muted/40 ring-1 ring-foreground/10"
      aria-hidden
    />
  );
}

async function ManagerClassGradesContent({
  classId,
  actorUserId,
  classRow,
}: {
  classId: string;
  actorUserId: string | null;
  classRow: ManagerClassRow;
}) {
  const adminClient = createSupabaseAdminClient();
  const pageData = await loadClassGradesPageData(
    adminClient,
    actorUserId,
    classId,
    { classRow }
  );

  return (
    <ClassStudentGradesSection
      classId={classId}
      classRow={pageData.classRow}
      rows={pageData.rows}
      classTasks={pageData.tasks}
      finalExam={pageData.finalExam}
      finalExamStudentGrades={pageData.finalExamStudentGrades}
    />
  );
}
