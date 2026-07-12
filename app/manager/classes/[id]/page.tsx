import { notFound } from "next/navigation";
import { ClassDetailsPanel } from "@/components/manager/classes/class-details-panel";
import { getSessionRole } from "@/lib/auth/session";
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
  const role = await getSessionRole();
  const classRow = await getClassForManager(adminClient, role, id);

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
    listClassSessionsForManager(adminClient, role, id),
    listClassStudentsForManager(adminClient, role, id),
    listAvailableStudentsForClass(adminClient, role, id),
    getClassFinalExamForManager(adminClient, role, id),
    getClassAnalyticsForManager(adminClient, role, id),
    listClassTeacherOptionsForManager(adminClient, role, id),
    listSubjectsForManager(adminClient, role),
    listSemestersForManager(adminClient, role),
    getClassComputedGradeLockStateForManager(adminClient, role, id),
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
