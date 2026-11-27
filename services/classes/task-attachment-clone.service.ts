import "server-only";

import {
  TASK_ATTACHMENT_CLONE_JOB_STATUSES,
  TASK_ATTACHMENT_ENTITIES,
  TASK_ATTACHMENT_MAX_FILES,
} from "@/lib/constants/task-attachments";
import { buildTaskAttachmentStoragePath } from "@/lib/manager/task-attachments/storage-path";
import { scheduleAfterResponse } from "@/lib/ops/schedule-after-response";
import * as cloneJobRepository from "@/repositories/task-attachment-clone-job.repository";
import type { TaskAttachmentCloneJobRecord } from "@/repositories/task-attachment-clone-job.repository";
import * as taskAttachmentRepository from "@/repositories/task-attachment.repository";
import * as taskAttachmentStorageRepository from "@/repositories/task-attachment-storage.repository";
import type { ClassTaskRecord } from "@/repositories/class-task.repository";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const STALE_RUNNING_MS = 5 * 60 * 1000;

/**
 * Enqueue deep-copy jobs for newly cloned class tasks, then process after response.
 */
export async function enqueueAttachmentCloneJobsForClassTasks(
  adminClient: Supabase,
  classTasks: ClassTaskRecord[]
): Promise<{ error: string | null }> {
  const withSource = classTasks.filter(
    (task) =>
      typeof task.source_subject_task_id === "string" &&
      task.source_subject_task_id.length > 0
  );

  if (withSource.length === 0) {
    return { error: null };
  }

  const subjectIds = [
    ...new Set(
      withSource.map((task) => task.source_subject_task_id as string)
    ),
  ];

  const attachmentsResult =
    await taskAttachmentRepository.listTaskAttachmentsByEntityIds(
      adminClient,
      TASK_ATTACHMENT_ENTITIES.SUBJECT_TASK,
      subjectIds
    );

  if (attachmentsResult.error) {
    return { error: attachmentsResult.error.message };
  }

  const subjectIdsWithFiles = new Set(
    (attachmentsResult.data ?? []).map((row) => row.entity_id)
  );

  const jobs = withSource
    .filter((task) =>
      subjectIdsWithFiles.has(task.source_subject_task_id as string)
    )
    .map((task) => ({
      class_task_id: task.id,
      source_subject_task_id: task.source_subject_task_id,
    }));

  if (jobs.length === 0) {
    return { error: null };
  }

  const created = await cloneJobRepository.createTaskAttachmentCloneJobs(
    adminClient,
    jobs
  );
  if (created.error) {
    return { error: created.error.message };
  }

  scheduleAttachmentCloneProcessing(adminClient);
  return { error: null };
}

/** Schedule (or run inline) pending clone job processing. */
export function scheduleAttachmentCloneProcessing(adminClient: Supabase): void {
  const deferred = scheduleAfterResponse(() =>
    processPendingTaskAttachmentCloneJobs(adminClient)
  );
  if (!deferred) {
    void processPendingTaskAttachmentCloneJobs(adminClient).catch((error) => {
      console.error("[task-attachments] clone processing failed", error);
    });
  }
}

/**
 * Process pending clone jobs (claim → copy files → complete/fail).
 * Safe to call repeatedly; reclaim stale running jobs first.
 */
export async function processPendingTaskAttachmentCloneJobs(
  adminClient: Supabase
): Promise<void> {
  const staleBefore = new Date(Date.now() - STALE_RUNNING_MS).toISOString();
  await cloneJobRepository.resetStaleRunningCloneJobs(adminClient, staleBefore);

  const pending = await cloneJobRepository.listPendingCloneJobs(adminClient, 50);
  if (pending.error || !pending.data?.length) {
    return;
  }

  for (const job of pending.data as TaskAttachmentCloneJobRecord[]) {
    await processOneCloneJob(adminClient, job.id);
  }
}

async function processOneCloneJob(
  adminClient: Supabase,
  jobId: string
): Promise<void> {
  const claimed = await cloneJobRepository.claimCloneJob(adminClient, jobId);
  if (claimed.error || !claimed.data) {
    return;
  }

  const job = claimed.data as TaskAttachmentCloneJobRecord;

  try {
    if (!job.source_subject_task_id) {
      await cloneJobRepository.completeCloneJob(adminClient, job.id);
      return;
    }

    const sourceAttachments =
      await taskAttachmentRepository.listTaskAttachmentsByEntity(
        adminClient,
        TASK_ATTACHMENT_ENTITIES.SUBJECT_TASK,
        job.source_subject_task_id
      );

    if (sourceAttachments.error) {
      await cloneJobRepository.failCloneJob(
        adminClient,
        job.id,
        sourceAttachments.error.message
      );
      return;
    }

    const existingCountResult =
      await taskAttachmentRepository.countTaskAttachmentsByEntity(
        adminClient,
        TASK_ATTACHMENT_ENTITIES.CLASS_TASK,
        job.class_task_id
      );

    if (existingCountResult.error) {
      await cloneJobRepository.failCloneJob(
        adminClient,
        job.id,
        existingCountResult.error.message
      );
      return;
    }

    let remaining =
      TASK_ATTACHMENT_MAX_FILES - (existingCountResult.count ?? 0);

    if (remaining <= 0) {
      await cloneJobRepository.completeCloneJob(adminClient, job.id);
      return;
    }

    const sources = (sourceAttachments.data ?? []).slice(0, remaining);
    let copiedCount = 0;
    let lastError: string | null = null;

    for (const source of sources) {
      const downloaded =
        await taskAttachmentStorageRepository.downloadTaskAttachmentStorageObject(
          adminClient,
          source.storage_path
        );

      if (downloaded.error || !downloaded.data) {
        lastError =
          downloaded.error?.message ?? "Unable to download source attachment.";
        break;
      }

      const bytes = Buffer.from(await downloaded.data.arrayBuffer());
      const destPath = buildTaskAttachmentStoragePath(
        TASK_ATTACHMENT_ENTITIES.CLASS_TASK,
        job.class_task_id,
        source.file_name
      );

      const uploaded =
        await taskAttachmentStorageRepository.uploadTaskAttachmentStorageObject(
          adminClient,
          destPath,
          bytes,
          source.mime_type
        );

      if (uploaded.error) {
        lastError = uploaded.error.message;
        break;
      }

      const created = await taskAttachmentRepository.createTaskAttachment(
        adminClient,
        {
          entity: TASK_ATTACHMENT_ENTITIES.CLASS_TASK,
          entity_id: job.class_task_id,
          storage_path: destPath,
          file_name: source.file_name,
          mime_type: source.mime_type,
          file_size: source.file_size,
          uploaded_by: null,
          sort_order: source.sort_order,
        }
      );

      if (created.error) {
        await taskAttachmentStorageRepository.removeTaskAttachmentStorageObjects(
          adminClient,
          [destPath]
        );
        lastError = created.error.message;
        break;
      }

      copiedCount += 1;
      remaining -= 1;
      if (remaining <= 0) {
        break;
      }
    }

    if (lastError) {
      // Keep successful copies; surface failure so the UI can refresh/retry leftovers.
      await cloneJobRepository.failCloneJob(
        adminClient,
        job.id,
        copiedCount > 0
          ? `Copied ${copiedCount} file(s), then failed: ${lastError}`
          : lastError
      );
      return;
    }

    await cloneJobRepository.completeCloneJob(adminClient, job.id);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Attachment clone failed.";
    await cloneJobRepository.failCloneJob(adminClient, job.id, message);
  }
}

export async function getLatestCloneJobForClassTask(
  adminClient: Supabase,
  classTaskId: string
): Promise<TaskAttachmentCloneJobRecord | null> {
  const result = await cloneJobRepository.findLatestCloneJobByClassTaskId(
    adminClient,
    classTaskId
  );
  if (result.error || !result.data) {
    return null;
  }
  return result.data as TaskAttachmentCloneJobRecord;
}

export function isCloneJobBlockingUploads(
  status: string | null | undefined
): boolean {
  return (
    status === TASK_ATTACHMENT_CLONE_JOB_STATUSES.PENDING ||
    status === TASK_ATTACHMENT_CLONE_JOB_STATUSES.RUNNING
  );
}
