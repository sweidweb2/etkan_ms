import { notFound } from "next/navigation";
import { SubjectDetailsPanel } from "@/components/manager/subjects/subject-details-panel";
import { getSessionPack } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { logOpsWarn } from "@/lib/ops/logger";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasPermissionInSet } from "@/services/auth/authorization.service";
import { listCategoriesForManager } from "@/services/classes/category.service";
import {
  listExercisesForManager,
  listSubjectCatalogLinksForManager,
} from "@/services/classes/exercise.service";
import { getSubjectDetailForManager } from "@/services/classes/subject.service";
import { TASK_ATTACHMENT_ENTITIES } from "@/lib/constants/task-attachments";
import { listSubjectTasksForManager } from "@/services/subjects/subject-tasks.service";
import { listTaskAttachmentsByEntityIdsUnchecked } from "@/services/classes/task-attachments.service";
import type { TaskAttachmentRow } from "@/types/task-attachment";

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

  const softEmpty = (scope: string) => (error: unknown) => {
    logOpsWarn("manager/subjects/[id]", scope, {
      subjectId: id,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  };

  const [detail, categories, exercises, links, tasks] = await Promise.all([
    getSubjectDetailForManager(adminClient, actorUserId, id),
    listCategoriesForManager(adminClient, actorUserId).catch(
      softEmpty("Categories list failed")
    ),
    listExercisesForManager(adminClient, actorUserId).catch(
      softEmpty("Exercises list failed")
    ),
    listSubjectCatalogLinksForManager(adminClient, actorUserId, id),
    canViewTasks
      ? listSubjectTasksForManager(adminClient, actorUserId, id).catch(
          softEmpty("Subject tasks list failed")
        )
      : Promise.resolve([]),
  ]);

  if (!detail) {
    notFound();
  }

  const attachmentsByTaskId: Record<string, TaskAttachmentRow[]> = {};
  if (canViewTasks && tasks.length > 0) {
    try {
      const rows = await listTaskAttachmentsByEntityIdsUnchecked(
        adminClient,
        TASK_ATTACHMENT_ENTITIES.SUBJECT_TASK,
        tasks.map((task) => task.id)
      );
      for (const row of rows) {
        const bucket = attachmentsByTaskId[row.entity_id] ?? [];
        bucket.push(row);
        attachmentsByTaskId[row.entity_id] = bucket;
      }
    } catch {
      // Keep page usable if attachments fail to load.
    }
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
      taskAttachmentsByTaskId={attachmentsByTaskId}
    />
  );
}
