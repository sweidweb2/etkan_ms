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
import { getClassForManager, getClassFinalExamForManager } from "@/services/class.service";
import { listClassStudentGradesForManager } from "@/services/student-course-grade.service";

type ManagerClassGradesPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ManagerClassGradesPage({
  params,
}: ManagerClassGradesPageProps) {
  const { id } = await params;
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const classRow = await getClassForManager(adminClient, user?.id ?? null, id);

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
        <ManagerClassGradesContent classId={id} classRow={classRow} />
      ) : (
        <ClassGradesLockedSection status={classRow.status} />
      )}
    </div>
  );
}

async function ManagerClassGradesContent({
  classId,
  classRow,
}: {
  classId: string;
  classRow: Awaited<ReturnType<typeof getClassForManager>>;
}) {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const [{ rows, tasks }, finalExamBundle] = await Promise.all([
    listClassStudentGradesForManager(adminClient, user?.id ?? null, classId),
    getClassFinalExamForManager(adminClient, user?.id ?? null, classId),
  ]);

  if (!classRow) {
    return null;
  }

  return (
    <ClassStudentGradesSection
      classId={classId}
      classRow={classRow}
      rows={rows}
      classTasks={tasks}
      finalExam={finalExamBundle.finalExam}
      finalExamStudentGrades={finalExamBundle.studentGrades}
    />
  );
}
