import { notFound } from "next/navigation";
import { TeacherClassTaskDetailsPanel } from "@/components/teacher/teacher-class-task-details-panel";
import { getSessionUser } from "@/lib/auth/session";
import {
  getTeacherClassDetailRoute,
  ROUTES,
} from "@/lib/constants/routes";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getTeachingClassTaskPageBundleForSelf } from "@/services/classes/teacher-class-self.service";

type TeacherClassTaskDetailPageProps = {
  params: Promise<{ id: string; taskId: string }>;
};

export default async function TeacherClassTaskDetailPage({
  params,
}: TeacherClassTaskDetailPageProps) {
  const { id, taskId } = await params;
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const actorUserId = user?.id ?? null;

  const bundle = await getTeachingClassTaskPageBundleForSelf(
    adminClient,
    actorUserId,
    id,
    taskId
  );

  if (!bundle) {
    notFound();
  }

  return (
    <TeacherClassTaskDetailsPanel
      task={bundle.task}
      classRow={bundle.classRow}
      initialStudentTasks={bundle.studentTasks}
      initialUploads={bundle.uploads}
      lockedUserIds={bundle.lockedUserIds}
      hasComputedGrades={bundle.hasComputedGrades}
      navigation={{
        classesListHref: ROUTES.TEACHER_CLASSES,
        classesListLabel: "My classes",
        classDetailHref: getTeacherClassDetailRoute(id, "tasks"),
      }}
    />
  );
}
