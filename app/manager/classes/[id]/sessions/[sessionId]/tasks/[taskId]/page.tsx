import { SessionTaskDetailsPanel } from "@/components/manager/classes/session-task-details-panel";

type ManagerClassSessionTaskDetailPageProps = {
  params: Promise<{ id: string; sessionId: string; taskId: string }>;
};

export default async function ManagerClassSessionTaskDetailPage({
  params,
}: ManagerClassSessionTaskDetailPageProps) {
  const { id, sessionId, taskId } = await params;

  return (
    <SessionTaskDetailsPanel
      classId={id}
      sessionId={sessionId}
      taskId={taskId}
    />
  );
}
