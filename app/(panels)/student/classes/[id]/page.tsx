import { notFound } from "next/navigation";
import { StudentClassDetailsPanel } from "@/components/student/classes/student-class-details-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStudentClassDetailForSelf } from "@/services/classes/student-class-self.service";

type StudentClassDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function StudentClassDetailPage({
  params,
}: StudentClassDetailPageProps) {
  const { id: classId } = await params;
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const actorUserId = user?.id ?? null;

  const detail = await getStudentClassDetailForSelf(
    adminClient,
    actorUserId,
    classId
  );

  if (!detail) {
    notFound();
  }

  return (
    <StudentClassDetailsPanel
      classRow={detail.classRow}
      sessions={detail.sessions}
      detail={detail.detail}
      finalExam={detail.finalExam}
      studentFinalExamGrade={detail.studentFinalExamGrade}
      teamLeader={detail.teamLeader}
      currentUserId={actorUserId}
    />
  );
}
