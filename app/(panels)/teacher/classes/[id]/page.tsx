import { notFound } from "next/navigation";
import { TeacherClassDetailsPanel } from "@/components/teacher/teacher-class-details-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getClassComputedGradeLockStateForManager } from "@/services/classes/class-computed-grade-lock.service";
import {
  getClassForManager,
  listClassStudentsForManager,
} from "@/services/classes/class.service";
import {
  getTeachingClassDetailForSelf,
  getTeachingClassTaskGradeSummaryForSelf,
} from "@/services/classes/teacher-class-self.service";

type TeacherClassDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function TeacherClassDetailPage({
  params,
}: TeacherClassDetailPageProps) {
  const { id: classId } = await params;
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const actorUserId = user?.id ?? null;

  const teachingDetail = await getTeachingClassDetailForSelf(
    adminClient,
    actorUserId,
    classId
  );

  if (!teachingDetail) {
    notFound();
  }

  const [classRow, computedGradeLock, taskGradeSummary, students] =
    await Promise.all([
      getClassForManager(adminClient, actorUserId, classId),
      getClassComputedGradeLockStateForManager(adminClient, actorUserId, classId),
      getTeachingClassTaskGradeSummaryForSelf(adminClient, actorUserId, classId),
      listClassStudentsForManager(adminClient, actorUserId, classId),
    ]);

  if (!classRow) {
    notFound();
  }

  return (
    <TeacherClassDetailsPanel
      classRow={classRow}
      initialSessions={teachingDetail.sessions}
      initialTasks={teachingDetail.tasks}
      initialStudents={students}
      hasComputedGrades={computedGradeLock.hasComputedGrades}
      assignedAt={teachingDetail.classRow.assigned_at}
      taskGradeSummary={taskGradeSummary}
    />
  );
}
