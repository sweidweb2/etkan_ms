import "server-only";

import {
  TASK_ATTACHMENT_CLONE_JOB_STATUSES,
  type TaskAttachmentCloneJobStatus,
} from "@/lib/constants/task-attachments";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const CLONE_JOB_COLUMNS =
  "id, class_task_id, source_subject_task_id, status, error_message, created_at, updated_at, completed_at";

export type TaskAttachmentCloneJobRecord = {
  id: string;
  class_task_id: string;
  source_subject_task_id: string | null;
  status: TaskAttachmentCloneJobStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export type CreateTaskAttachmentCloneJobInput = {
  class_task_id: string;
  source_subject_task_id: string | null;
};

export async function createTaskAttachmentCloneJobs(
  client: Supabase,
  rows: CreateTaskAttachmentCloneJobInput[]
) {
  if (rows.length === 0) {
    return { data: [] as TaskAttachmentCloneJobRecord[], error: null };
  }

  return client
    .from("task_attachment_clone_jobs")
    .insert(
      rows.map((row) => ({
        class_task_id: row.class_task_id,
        source_subject_task_id: row.source_subject_task_id,
        status: TASK_ATTACHMENT_CLONE_JOB_STATUSES.PENDING,
      }))
    )
    .select(CLONE_JOB_COLUMNS);
}

export async function listOpenCloneJobsByClassTaskIds(
  client: Supabase,
  classTaskIds: string[]
) {
  if (classTaskIds.length === 0) {
    return { data: [] as TaskAttachmentCloneJobRecord[], error: null };
  }

  return client
    .from("task_attachment_clone_jobs")
    .select(CLONE_JOB_COLUMNS)
    .in("class_task_id", classTaskIds)
    .in("status", [
      TASK_ATTACHMENT_CLONE_JOB_STATUSES.PENDING,
      TASK_ATTACHMENT_CLONE_JOB_STATUSES.RUNNING,
    ]);
}

export async function findOpenCloneJobByClassTaskId(
  client: Supabase,
  classTaskId: string
) {
  return client
    .from("task_attachment_clone_jobs")
    .select(CLONE_JOB_COLUMNS)
    .eq("class_task_id", classTaskId)
    .in("status", [
      TASK_ATTACHMENT_CLONE_JOB_STATUSES.PENDING,
      TASK_ATTACHMENT_CLONE_JOB_STATUSES.RUNNING,
    ])
    .maybeSingle();
}

export async function findLatestCloneJobByClassTaskId(
  client: Supabase,
  classTaskId: string
) {
  return client
    .from("task_attachment_clone_jobs")
    .select(CLONE_JOB_COLUMNS)
    .eq("class_task_id", classTaskId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
}

export async function listPendingCloneJobs(
  client: Supabase,
  limit = 50
) {
  return client
    .from("task_attachment_clone_jobs")
    .select(CLONE_JOB_COLUMNS)
    .eq("status", TASK_ATTACHMENT_CLONE_JOB_STATUSES.PENDING)
    .order("created_at", { ascending: true })
    .limit(limit);
}

export async function claimCloneJob(
  client: Supabase,
  jobId: string
) {
  const now = new Date().toISOString();
  return client
    .from("task_attachment_clone_jobs")
    .update({
      status: TASK_ATTACHMENT_CLONE_JOB_STATUSES.RUNNING,
      updated_at: now,
      error_message: null,
    })
    .eq("id", jobId)
    .eq("status", TASK_ATTACHMENT_CLONE_JOB_STATUSES.PENDING)
    .select(CLONE_JOB_COLUMNS)
    .maybeSingle();
}

export async function completeCloneJob(client: Supabase, jobId: string) {
  const now = new Date().toISOString();
  return client
    .from("task_attachment_clone_jobs")
    .update({
      status: TASK_ATTACHMENT_CLONE_JOB_STATUSES.COMPLETED,
      updated_at: now,
      completed_at: now,
      error_message: null,
    })
    .eq("id", jobId)
    .select(CLONE_JOB_COLUMNS)
    .maybeSingle();
}

export async function failCloneJob(
  client: Supabase,
  jobId: string,
  errorMessage: string
) {
  const now = new Date().toISOString();
  return client
    .from("task_attachment_clone_jobs")
    .update({
      status: TASK_ATTACHMENT_CLONE_JOB_STATUSES.FAILED,
      updated_at: now,
      completed_at: now,
      error_message: errorMessage.slice(0, 1000),
    })
    .eq("id", jobId)
    .select(CLONE_JOB_COLUMNS)
    .maybeSingle();
}

export async function resetStaleRunningCloneJobs(
  client: Supabase,
  olderThanIso: string
) {
  return client
    .from("task_attachment_clone_jobs")
    .update({
      status: TASK_ATTACHMENT_CLONE_JOB_STATUSES.PENDING,
      updated_at: new Date().toISOString(),
      error_message: null,
    })
    .eq("status", TASK_ATTACHMENT_CLONE_JOB_STATUSES.RUNNING)
    .lt("updated_at", olderThanIso)
    .select(CLONE_JOB_COLUMNS);
}
