import { notFound } from "next/navigation";
import { ClassSessionDetailsPanel } from "@/components/manager/classes/class-session-details-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getClassComputedGradeLockStateForManager } from "@/services/class-computed-grade-lock.service";
import { getSessionDetailForManager } from "@/services/session.service";

type ManagerClassSessionDetailPageProps = {
  params: Promise<{ id: string; sessionId: string }>;
};

export default async function ManagerClassSessionDetailPage({
  params,
}: ManagerClassSessionDetailPageProps) {
  const { id, sessionId } = await params;
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const [detail, computedGradeLock] = await Promise.all([
    getSessionDetailForManager(adminClient, user?.id ?? null, id, sessionId),
    getClassComputedGradeLockStateForManager(adminClient, user?.id ?? null, id),
  ]);

  if (!detail) {
    notFound();
  }

  return (
    <ClassSessionDetailsPanel
      session={detail.session}
      classRow={detail.classRow}
      linkedPhase={detail.linkedPhase}
      phaseOptions={detail.phaseOptions}
      initialTasks={detail.tasks}
      initialAttendees={detail.attendees}
      hasComputedGrades={computedGradeLock.hasComputedGrades}
      lockedUserIds={computedGradeLock.lockedUserIds}
    />
  );
}
