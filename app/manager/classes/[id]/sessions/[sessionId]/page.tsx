import { notFound } from "next/navigation";
import { ClassSessionDetailsPanel } from "@/components/manager/classes/class-session-details-panel";
import { getSessionRole } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSessionDetailForManager } from "@/services/session.service";

type ManagerClassSessionDetailPageProps = {
  params: Promise<{ id: string; sessionId: string }>;
};

export default async function ManagerClassSessionDetailPage({
  params,
}: ManagerClassSessionDetailPageProps) {
  const { id, sessionId } = await params;
  const adminClient = createSupabaseAdminClient();
  const role = await getSessionRole();
  const detail = await getSessionDetailForManager(
    adminClient,
    role,
    id,
    sessionId
  );

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
    />
  );
}
