import { notFound } from "next/navigation";
import { TeacherClassDetailsPanel } from "@/components/teacher/teacher-class-details-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getTeachingClassDetailForSelf } from "@/services/classes/teacher-class-self.service";

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

  const detail = await getTeachingClassDetailForSelf(
    adminClient,
    actorUserId,
    classId
  );

  if (!detail) {
    notFound();
  }

  return (
    <TeacherClassDetailsPanel
      classRow={detail.classRow}
      sessions={detail.sessions}
      tasks={detail.tasks}
    />
  );
}
