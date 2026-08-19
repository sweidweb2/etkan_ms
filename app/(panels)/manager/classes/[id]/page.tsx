import { ClassAnalyticsDeferred } from "@/components/manager/classes/class-analytics-deferred-section";
import { ClassDetailsPanel } from "@/components/manager/classes/class-details-panel";
import { getSessionPack } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createNavStepTimer } from "@/lib/debug/nav-timing";
import { hasPermissionInSet } from "@/services/authorization.service";
import {
  getClassFinalExamForManager,
  getClassForManager,
  listClassSessionsForManager,
  listClassStudentsForManager,
  listClassTeacherOptionsForManager,
} from "@/services/class.service";
import { getClassComputedGradeLockStateForManager } from "@/services/class-computed-grade-lock.service";
import { notFound } from "next/navigation";

type ManagerClassDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ManagerClassDetailPage({
  params,
}: ManagerClassDetailPageProps) {
  const { id } = await params;
  const adminClient = createSupabaseAdminClient();
  const pack = await getSessionPack();
  const actorUserId = pack.user?.id ?? null;
  const permissions = pack.permissions;

  const canSessions = hasPermissionInSet(
    permissions,
    PERMISSIONS.SESSIONS_VIEW
  );
  const canStudents = hasPermissionInSet(
    permissions,
    PERMISSIONS.CLASSES_VIEW
  );
  const canFinalExam = hasPermissionInSet(
    permissions,
    PERMISSIONS.FINAL_EXAMS_VIEW
  );
  const canAnalytics = hasPermissionInSet(
    permissions,
    PERMISSIONS.CLASSES_VIEW_ANALYTICS
  );
  const canGrades = hasPermissionInSet(permissions, PERMISSIONS.GRADES_VIEW);

  const timer = createNavStepTimer("class_detail");
  const [
    classRow,
    sessions,
    students,
    finalExamBundle,
    teachers,
    computedGradeLock,
  ] = await Promise.all([
    timer.step("class", () =>
      getClassForManager(adminClient, actorUserId, id)
    ),
    timer.step("sessions", () =>
      canSessions
        ? listClassSessionsForManager(adminClient, actorUserId, id)
        : Promise.resolve([])
    ),
    timer.step("students", () =>
      canStudents
        ? listClassStudentsForManager(adminClient, actorUserId, id)
        : Promise.resolve([])
    ),
    timer.step("finalExam", () =>
      canFinalExam
        ? getClassFinalExamForManager(adminClient, actorUserId, id)
        : Promise.resolve({ finalExam: null, studentGrades: [] })
    ),
    timer.step("teachers", () =>
      listClassTeacherOptionsForManager(adminClient, actorUserId, id)
    ),
    timer.step("gradeLock", () =>
      canGrades
        ? getClassComputedGradeLockStateForManager(adminClient, actorUserId, id)
        : Promise.resolve({ hasComputedGrades: false, lockedUserIds: [] })
    ),
  ]);
  timer.end();

  if (!classRow) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <ClassDetailsPanel
        classRow={classRow}
        initialSessions={sessions}
        initialStudents={students}
        initialAvailableStudents={[]}
        transferClassOptions={[]}
        initialFinalExam={finalExamBundle.finalExam}
        initialStudentGrades={finalExamBundle.studentGrades}
        initialTeachers={teachers}
        subjectOptions={[]}
        semesterOptions={[]}
        hasComputedGrades={computedGradeLock.hasComputedGrades}
        lockedUserIds={computedGradeLock.lockedUserIds}
      />
      <ClassAnalyticsDeferred
        classId={id}
        className={classRow.name}
        actorUserId={actorUserId}
        enabled={canAnalytics}
      />
    </div>
  );
}
