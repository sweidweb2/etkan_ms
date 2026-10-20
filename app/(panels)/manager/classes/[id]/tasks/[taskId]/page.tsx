import { notFound } from "next/navigation";
import { ClassTaskDetailsPanel } from "@/components/manager/classes/class-task-details-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getClassComputedGradeLockStateForManager } from "@/services/classes/class-computed-grade-lock.service";
import { getClassTaskDetailForManager } from "@/services/classes/session.service";

type ManagerClassTaskDetailPageProps = {
  params: Promise<{ id: string; taskId: string }>;
};

export default async function ManagerClassTaskDetailPage({
  params,
}: ManagerClassTaskDetailPageProps) {
  const { id, taskId } = await params;
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const [detail, computedGradeLock] = await Promise.all([
    getClassTaskDetailForManager(adminClient, user?.id ?? null, id, taskId),
    getClassComputedGradeLockStateForManager(adminClient, user?.id ?? null, id),
  ]);

  if (!detail) {
    notFound();
  }

  return (
    <ClassTaskDetailsPanel
      task={detail.task}
      classRow={detail.classRow}
      initialStudentTasks={detail.studentTasks}
      initialUploads={detail.uploads}
      lockedUserIds={computedGradeLock.lockedUserIds}
      hasComputedGrades={computedGradeLock.hasComputedGrades}
    />
  );
}
