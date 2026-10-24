import { notFound } from "next/navigation";
import { SubjectDetailsPanel } from "@/components/manager/subjects/subject-details-panel";
import { getSessionPack } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasPermissionInSet } from "@/services/auth/authorization.service";
import { listCategoriesForManager } from "@/services/classes/category.service";
import {
  listExercisesForManager,
  listSubjectCatalogLinksForManager,
} from "@/services/classes/exercise.service";
import { getSubjectDetailForManager } from "@/services/classes/subject.service";
import { listSubjectTasksForManager } from "@/services/subjects/subject-tasks.service";

type ManagerSubjectDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ManagerSubjectDetailPage({
  params,
}: ManagerSubjectDetailPageProps) {
  const { id } = await params;
  const adminClient = createSupabaseAdminClient();
  const pack = await getSessionPack();
  const actorUserId = pack.user?.id ?? null;
  const canViewTasks = hasPermissionInSet(
    pack.permissions,
    PERMISSIONS.SUBJECTS_TASKS_VIEW
  );

  const [detail, categories, exercises, links, tasks] = await Promise.all([
    getSubjectDetailForManager(adminClient, actorUserId, id),
    listCategoriesForManager(adminClient, actorUserId).catch(() => []),
    listExercisesForManager(adminClient, actorUserId).catch(() => []),
    listSubjectCatalogLinksForManager(adminClient, actorUserId, id),
    canViewTasks
      ? listSubjectTasksForManager(adminClient, actorUserId, id).catch(
          () => []
        )
      : Promise.resolve([]),
  ]);

  if (!detail) {
    notFound();
  }

  return (
    <SubjectDetailsPanel
      subject={detail.subject}
      classes={detail.classes}
      categories={categories}
      exercises={exercises}
      linkedCategoryIds={links.categoryIds}
      linkedExerciseIds={links.exerciseIds}
      tasks={tasks}
    />
  );
}
