import { notFound } from "next/navigation";
import { SessionTaskDetailsPanel } from "@/components/manager/classes/session-task-details-panel";
import { getSessionRole } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSessionTaskDetailForManager } from "@/services/session.service";

type ManagerClassSessionTaskDetailPageProps = {
  params: Promise<{ id: string; sessionId: string; taskId: string }>;
};

export default async function ManagerClassSessionTaskDetailPage({
  params,
}: ManagerClassSessionTaskDetailPageProps) {
  const { id, sessionId, taskId } = await params;
  const adminClient = createSupabaseAdminClient();
  const role = await getSessionRole();
  const detail = await getSessionTaskDetailForManager(
    adminClient,
    role,
    id,
    sessionId,
    taskId
  );

  if (!detail) {
    notFound();
  }

  return (
    <SessionTaskDetailsPanel
      task={detail.task}
      session={detail.session}
      classRow={detail.classRow}
      initialStudentTasks={detail.studentTasks}
    />
  );
}
