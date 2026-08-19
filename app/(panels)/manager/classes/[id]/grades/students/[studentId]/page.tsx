import { notFound } from "next/navigation";
import { ClassGradesLockedSection } from "@/components/manager/classes/class-grades-locked-section";
import { StudentClassGradeDetailsPanel } from "@/components/manager/classes/student-class-grade-details-panel";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { getSessionUser } from "@/lib/auth/session";
import {
  getManagerClassDetailRoute,
  getManagerClassGradesRoute,
  ROUTES,
} from "@/lib/constants/routes";
import { isClassGradesUnlocked } from "@/lib/manager/class-grades-access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getClassForManager } from "@/services/classes/class.service";
import { loadClassStudentGradeDetailPageData } from "@/services/classes/student-course-grade.service";

type ManagerClassStudentGradesDetailPageProps = {
  params: Promise<{ id: string; studentId: string }>;
};

export default async function ManagerClassStudentGradesDetailPage({
  params,
}: ManagerClassStudentGradesDetailPageProps) {
  const { id, studentId } = await params;
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const actorUserId = user?.id ?? null;

  const classRow = await getClassForManager(adminClient, actorUserId, id);

  if (!classRow) {
    notFound();
  }

  const gradesUnlocked = isClassGradesUnlocked(classRow.status);

  if (!gradesUnlocked) {
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
              <BreadcrumbLink href={getManagerClassGradesRoute(id)}>
                Grades
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Student grades</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <ClassGradesLockedSection status={classRow.status} />
      </div>
    );
  }

  const pageData = await loadClassStudentGradeDetailPageData(
    adminClient,
    actorUserId,
    id,
    studentId
  );

  if (!pageData) {
    notFound();
  }

  return (
    <StudentClassGradeDetailsPanel
      classId={id}
      classRow={pageData.classRow}
      bundle={{
        student: pageData.student,
        gradeRow: pageData.gradeRow,
        detail: pageData.detail,
        classTasks: pageData.classTasks,
        finalExam: pageData.finalExam,
      }}
    />
  );
}
