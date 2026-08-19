import { notFound } from "next/navigation";
import { SessionTaskDetailsPanel } from "@/components/manager/classes/session-task-details-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getClassComputedGradeLockStateForManager } from "@/services/classes/class-computed-grade-lock.service";
import { getSessionTaskDetailForManager } from "@/services/classes/session.service";

type ManagerClassSessionTaskDetailPageProps = {
  params: Promise<{ id: string; sessionId: string; taskId: string }>;
};

export default async function ManagerClassSessionTaskDetailPage({
  params,
}: ManagerClassSessionTaskDetailPageProps) {
  const { id, sessionId, taskId } = await params;
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const [detail, computedGradeLock] = await Promise.all([
    getSessionTaskDetailForManager(
      adminClient, user?.id ?? null,
      id,
      sessionId,
      taskId
    ),
    getClassComputedGradeLockStateForManager(adminClient, user?.id ?? null, id),
  ]);

  if (!detail) {
    notFound();
  }

  return (
    <SessionTaskDetailsPanel
      task={detail.task}
      session={detail.session}
      classRow={detail.classRow}
      initialStudentTasks={detail.studentTasks}
      lockedUserIds={computedGradeLock.lockedUserIds}
    />
  );
}
