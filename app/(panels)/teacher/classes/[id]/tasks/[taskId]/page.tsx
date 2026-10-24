import { notFound } from "next/navigation";
import { ClassTaskDetailsPanel } from "@/components/manager/classes/class-task-details-panel";
import { getSessionUser } from "@/lib/auth/session";
import {
  getTeacherClassDetailRoute,
  ROUTES,
} from "@/lib/constants/routes";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getClassComputedGradeLockStateForManager } from "@/services/classes/class-computed-grade-lock.service";
import { getClassTaskDetailForManager } from "@/services/classes/session.service";
import { getTeachingClassDetailForSelf } from "@/services/classes/teacher-class-self.service";

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

  const teaching = await getTeachingClassDetailForSelf(
    adminClient,
    actorUserId,
    id
  );
  if (!teaching) {
    notFound();
  }

  const [detail, computedGradeLock] = await Promise.all([
    getClassTaskDetailForManager(adminClient, actorUserId, id, taskId),
    getClassComputedGradeLockStateForManager(adminClient, actorUserId, id),
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
      navigation={{
        classesListHref: ROUTES.TEACHER_CLASSES,
        classesListLabel: "My classes",
        classDetailHref: getTeacherClassDetailRoute(id, "tasks"),
      }}
    />
  );
}
