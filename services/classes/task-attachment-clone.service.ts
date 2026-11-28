import "server-only";

import {
  TASK_ATTACHMENT_CLONE_JOB_STATUSES,
  TASK_ATTACHMENT_ENTITIES,
  TASK_ATTACHMENT_MAX_FILES,
} from "@/lib/constants/task-attachments";
import {
  isCloneSourceAlreadyCopied,
  isDuplicateStoragePathError,
} from "@/lib/manager/task-attachments/clone-dedupe";
import { buildTaskAttachmentStoragePath } from "@/lib/manager/task-attachments/storage-path";
import { logOpsError } from "@/lib/ops/logger";
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

/**
 * Schedule pending clone job processing via Next.js `after()`.
 * If `after()` is unavailable, run inline once. External cron
 * (`/api/cron/task-attachment-clone`) is the durability backup — do not also
 * fire a delayed setTimeout here (that doubles drain work under load).
 */
export function scheduleAttachmentCloneProcessing(adminClient: Supabase): void {
  const run = () =>
    processPendingTaskAttachmentCloneJobs(adminClient).catch((error) => {
      logOpsError("task-attachments/clone", error);
    });

  const deferred = scheduleAfterResponse(run);
  if (!deferred) {
    run();
  }
}

/**
 * Process pending clone jobs (claim → copy files → complete/fail).
 * Safe to call repeatedly: skips already-copied sources, reclaims stale
 * running jobs, and periodically requeues failed jobs for idempotent resume.
 */
export async function processPendingTaskAttachmentCloneJobs(
  adminClient: Supabase
): Promise<void> {
  const staleBefore = new Date(Date.now() - STALE_RUNNING_MS).toISOString();
  await cloneJobRepository.resetStaleRunningCloneJobs(adminClient, staleBefore);
  await cloneJobRepository.requeueStaleFailedCloneJobs(
    adminClient,
    staleBefore,
    20
  );

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

    const existingAttachments =
      await taskAttachmentRepository.listTaskAttachmentsByEntity(
        adminClient,
        TASK_ATTACHMENT_ENTITIES.CLASS_TASK,
        job.class_task_id
      );

    if (existingAttachments.error) {
      await cloneJobRepository.failCloneJob(
        adminClient,
        job.id,
        existingAttachments.error.message
      );
      return;
    }

    const copiedPaths: Array<{ storage_path: string }> = (
      existingAttachments.data ?? []
    ).map((row) => ({ storage_path: row.storage_path }));

    let remaining = TASK_ATTACHMENT_MAX_FILES - copiedPaths.length;
    const sources = sourceAttachments.data ?? [];
    const pendingSources = sources.filter((source) => {
      const destPath = buildTaskAttachmentStoragePath(
        TASK_ATTACHMENT_ENTITIES.CLASS_TASK,
        job.class_task_id,
        source.file_name,
        source.id
      );
      return !isCloneSourceAlreadyCopied(source.id, destPath, copiedPaths);
    });

    if (pendingSources.length === 0) {
      await cloneJobRepository.completeCloneJob(adminClient, job.id);
      return;
    }

    if (remaining <= 0) {
      await cloneJobRepository.failCloneJob(
        adminClient,
        job.id,
        `Class task already has the maximum of ${TASK_ATTACHMENT_MAX_FILES} attachments; cannot clone remaining subject files.`
      );
      return;
    }

    let copiedCount = 0;
    let skippedMissing = 0;
    let lastError: string | null = null;
    let stoppedForMax = false;

    for (const source of pendingSources) {
      if (remaining <= 0) {
        stoppedForMax = true;
        break;
      }

      // Deterministic object id = source attachment id (idempotent re-runs).
      const destPath = buildTaskAttachmentStoragePath(
        TASK_ATTACHMENT_ENTITIES.CLASS_TASK,
        job.class_task_id,
        source.file_name,
        source.id
      );

      if (isCloneSourceAlreadyCopied(source.id, destPath, copiedPaths)) {
        continue;
      }

      const downloaded =
        await taskAttachmentStorageRepository.downloadTaskAttachmentStorageObject(
          adminClient,
          source.storage_path
        );

      if (downloaded.error || !downloaded.data) {
        // Missing source blob: skip and continue other files.
        skippedMissing += 1;
        console.error(
          "[task-attachments] clone source missing",
          source.storage_path,
          downloaded.error?.message
        );
        continue;
      }

      const bytes = Buffer.from(await downloaded.data.arrayBuffer());

      // Upsert so a crash between upload and DB insert can resume cleanly.
      const uploaded =
        await taskAttachmentStorageRepository.uploadTaskAttachmentStorageObject(
          adminClient,
          destPath,
          bytes,
          source.mime_type,
          { upsert: true }
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
        if (isDuplicateStoragePathError(created.error.message)) {
          copiedPaths.push({ storage_path: destPath });
          copiedCount += 1;
          remaining -= 1;
          continue;
        }
        lastError = created.error.message;
        break;
      }

      copiedPaths.push({ storage_path: destPath });
      copiedCount += 1;
      remaining -= 1;
    }

    if (lastError) {
      // Keep successful copies; stale failed jobs are requeued for idempotent resume.
      await cloneJobRepository.failCloneJob(
        adminClient,
        job.id,
        copiedCount > 0
          ? `Copied ${copiedCount} file(s), then failed: ${lastError}`
          : lastError
      );
      return;
    }

    if (
      copiedCount === 0 &&
      skippedMissing > 0 &&
      skippedMissing === pendingSources.length
    ) {
      await cloneJobRepository.failCloneJob(
        adminClient,
        job.id,
        "All source attachment files are missing from storage."
      );
      return;
    }

    if (stoppedForMax) {
      await cloneJobRepository.failCloneJob(
        adminClient,
        job.id,
        copiedCount > 0
          ? `Copied ${copiedCount} file(s), then reached the maximum of ${TASK_ATTACHMENT_MAX_FILES} attachments; remaining subject files were not cloned.`
          : `Class task reached the maximum of ${TASK_ATTACHMENT_MAX_FILES} attachments; remaining subject files were not cloned.`
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
