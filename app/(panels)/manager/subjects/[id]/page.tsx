import { notFound } from "next/navigation";
import { SubjectDetailsPanel } from "@/components/manager/subjects/subject-details-panel";
import { getSessionPack } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { logOpsWarn } from "@/lib/ops/logger";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasPermissionInSet } from "@/services/auth/authorization.service";
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

  // Catalog linking UI is still "coming soon" — do not load full category /
  // exercise catalogs on this page (that was two full-table reads for unused UI).

  const [detail, tasks] = await Promise.all([
    getSubjectDetailForManager(adminClient, actorUserId, id),
    canViewTasks
      ? listSubjectTasksForManager(adminClient, actorUserId, id).catch(
          (error: unknown) => {
            logOpsWarn("manager/subjects/[id]", "Subject tasks list failed", {
              subjectId: id,
              error: error instanceof Error ? error.message : String(error),
            });
            return [];
          }
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
      tasks={tasks}
      taskAttachmentsByTaskId={attachmentsByTaskId}
    />
  );
}
