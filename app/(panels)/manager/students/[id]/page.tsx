import { notFound } from "next/navigation";
import { StudentDetailsPanel } from "@/components/manager/students/student-details-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listStudentActivityForManager } from "@/services/student-activity.service";
import { getStudentClassAcademicDetailForManager } from "@/services/student-course-grade.service";
import {
  getStudentDetailStatsForManager,
  getStudentForManager,
  listAssignableClassesForStudentManager,
  listJoinedClassesForStudentManager,
} from "@/services/student.service";
import type { ManagerStudentClassAcademicBundle } from "@/types/manager-student-class-detail";

type ManagerStudentDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ManagerStudentDetailPage({
  params,
}: ManagerStudentDetailPageProps) {
  const { id } = await params;
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();

  const student = await getStudentForManager(adminClient, user?.id ?? null, id);

  if (!student) {
    notFound();
  }

  const [stats, joinedClasses, availableClasses, activityRows] =
    await Promise.all([
      getStudentDetailStatsForManager(
        adminClient,
        user?.id ?? null,
        student.user_id
      ),
      listJoinedClassesForStudentManager(
        adminClient,
        user?.id ?? null,
        student.user_id
      ),
      listAssignableClassesForStudentManager(
        adminClient,
        user?.id ?? null,
        student.user_id
      ),
      listStudentActivityForManager(
        adminClient,
        user?.id ?? null,
        student.user_id
      ),
    ]);

  const academicResults = await Promise.all(
    joinedClasses.map(async (classRow) => {
      const academic = await getStudentClassAcademicDetailForManager(
        adminClient,
        user?.id ?? null,
        classRow.class_id,
        student.user_id
      );

      const bundle: ManagerStudentClassAcademicBundle = {
        classRow,
        detail: academic.detail,
        finalExam: academic.finalExam,
        studentFinalExamGrade: academic.studentFinalExamGrade,
      };

      return bundle;
    })
  );

  return (
    <StudentDetailsPanel
      student={student}
      stats={stats}
      availableClasses={availableClasses}
      classBundles={academicResults}
      activityRows={activityRows}
    />
  );
}
