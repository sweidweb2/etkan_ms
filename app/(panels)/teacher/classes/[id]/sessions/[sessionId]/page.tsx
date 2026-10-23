import { notFound } from "next/navigation";
import { TeacherSessionDetailsPanel } from "@/components/teacher/classes/teacher-session-details-panel";
import { UNAUTHORIZED_MESSAGE } from "@/lib/auth/permission-checks";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getClassComputedGradeLockStateForTeacher,
  getSessionDetailForTeacher,
} from "@/services/classes/teacher-session-tasks.service";

type TeacherClassSessionDetailPageProps = {
  params: Promise<{ id: string; sessionId: string }>;
};

export default async function TeacherClassSessionDetailPage({
  params,
}: TeacherClassSessionDetailPageProps) {
  const { id, sessionId } = await params;
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const actorUserId = user?.id ?? null;

  let detail;
  let computedGradeLock;
  try {
    [detail, computedGradeLock] = await Promise.all([
      getSessionDetailForTeacher(adminClient, actorUserId, id, sessionId),
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
    <TeacherSessionDetailsPanel
      session={detail.session}
      classRow={detail.classRow}
      initialTasks={detail.tasks}
      hasComputedGrades={computedGradeLock.hasComputedGrades}
    />
  );
}
