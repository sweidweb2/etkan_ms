import { notFound } from "next/navigation";
import { TeacherSessionTaskDetailsPanel } from "@/components/teacher/classes/teacher-session-task-details-panel";
import { UNAUTHORIZED_MESSAGE } from "@/lib/auth/permission-checks";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getClassComputedGradeLockStateForTeacher,
  getSessionTaskDetailForTeacher,
} from "@/services/classes/teacher-session-tasks.service";

type TeacherClassSessionTaskDetailPageProps = {
  params: Promise<{ id: string; sessionId: string; taskId: string }>;
};

export default async function TeacherClassSessionTaskDetailPage({
  params,
}: TeacherClassSessionTaskDetailPageProps) {
  const { id, sessionId, taskId } = await params;
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const actorUserId = user?.id ?? null;

  let detail;
  let computedGradeLock;
  try {
    [detail, computedGradeLock] = await Promise.all([
      getSessionTaskDetailForTeacher(
        adminClient,
        actorUserId,
        id,
        sessionId,
        taskId
      ),
      getClassComputedGradeLockStateForTeacher(adminClient, actorUserId, id),
    ]);
  } catch (error) {
    if (error instanceof Error && error.message === UNAUTHORIZED_MESSAGE) {
      notFound();
    }
    throw error;
  }

  if (!detail) {
    notFound();
  }

  return (
    <TeacherSessionTaskDetailsPanel
      task={detail.task}
      session={detail.session}
      classRow={detail.classRow}
      initialStudentTasks={detail.studentTasks}
      initialUploads={detail.uploads}
      lockedUserIds={computedGradeLock.lockedUserIds}
      hasComputedGrades={computedGradeLock.hasComputedGrades}
    />
  );
}
