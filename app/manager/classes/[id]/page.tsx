import { notFound } from "next/navigation";
import { ClassDetailsPanel } from "@/components/manager/classes/class-details-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getClassAnalyticsForManager,
  getClassFinalExamForManager,
  getClassForManager,
  listAvailableStudentsForClass,
  listClassSessionsForManager,
  listClassStudentsForManager,
  listClassTeacherOptionsForManager,
} from "@/services/class.service";
import { getClassComputedGradeLockStateForManager } from "@/services/class-computed-grade-lock.service";
import { listSemestersForManager } from "@/services/semester.service";
import { listSubjectsForManager } from "@/services/subject.service";

type ManagerClassDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ManagerClassDetailPage({
  params,
}: ManagerClassDetailPageProps) {
  const { id } = await params;
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const classRow = await getClassForManager(adminClient, user?.id ?? null, id);

  if (!classRow) {
    notFound();
  }

  const [
    sessions,
    students,
    availableStudents,
    finalExamBundle,
    analytics,
    teachers,
    subjects,
    semesters,
    computedGradeLock,
  ] = await Promise.all([
    listClassSessionsForManager(adminClient, user?.id ?? null, id),
    listClassStudentsForManager(adminClient, user?.id ?? null, id),
    listAvailableStudentsForClass(adminClient, user?.id ?? null, id),
    getClassFinalExamForManager(adminClient, user?.id ?? null, id),
    getClassAnalyticsForManager(adminClient, user?.id ?? null, id),
    listClassTeacherOptionsForManager(adminClient, user?.id ?? null, id),
    listSubjectsForManager(adminClient, user?.id ?? null),
    listSemestersForManager(adminClient, user?.id ?? null),
    getClassComputedGradeLockStateForManager(adminClient, user?.id ?? null, id),
  ]);

  return (
    <ClassDetailsPanel
      classRow={classRow}
      initialSessions={sessions}
      initialStudents={students}
      initialAvailableStudents={availableStudents}
      initialFinalExam={finalExamBundle.finalExam}
      initialStudentGrades={finalExamBundle.studentGrades}
      initialAnalytics={analytics}
      initialTeachers={teachers}
      subjectOptions={subjects.map((subject) => ({
        id: subject.id,
        name: subject.name,
        nb_sessions: subject.nb_sessions,
      }))}
      semesterOptions={semesters.map((semester) => ({
        id: semester.id,
        name: semester.name,
      }))}
      hasComputedGrades={computedGradeLock.hasComputedGrades}
      lockedUserIds={computedGradeLock.lockedUserIds}
    />
  );
}
