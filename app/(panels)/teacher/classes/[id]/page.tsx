import { notFound } from "next/navigation";
import { TeacherClassDetailsPanel } from "@/components/teacher/classes/teacher-class-details-panel";
import { UNAUTHORIZED_MESSAGE } from "@/lib/auth/permission-checks";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getMyClassDetailForTeacher } from "@/services/classes/teacher-class-self.service";

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

  let detail;
  try {
    detail = await getMyClassDetailForTeacher(
      adminClient,
      actorUserId,
      classId
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === UNAUTHORIZED_MESSAGE
    ) {
      notFound();
    }
    throw error;
  }

  if (!detail) {
    notFound();
  }

  return (
    <TeacherClassDetailsPanel
      classRow={detail.classRow}
      sessions={detail.sessions}
      students={detail.students}
    />
  );
}
