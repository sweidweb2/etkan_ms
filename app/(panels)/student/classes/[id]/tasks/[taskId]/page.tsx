import { notFound } from "next/navigation";
import { StudentClassTaskDetailsPanel } from "@/components/student/classes/student-class-task-details-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStudentClassTaskForSelf } from "@/services/classes/student-class-self.service";

type StudentClassTaskDetailPageProps = {
  params: Promise<{ id: string; taskId: string }>;
};

export default async function StudentClassTaskDetailPage({
  params,
}: StudentClassTaskDetailPageProps) {
  const { id: classId, taskId } = await params;
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const actorUserId = user?.id ?? null;

  const detail = await getStudentClassTaskForSelf(
    adminClient,
    actorUserId,
    classId,
    taskId
  );

  if (!detail) {
    notFound();
  }

  return <StudentClassTaskDetailsPanel detail={detail} />;
}
