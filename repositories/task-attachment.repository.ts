import "server-only";

import type {
  TaskAttachmentEntity,
} from "@/lib/constants/task-attachments";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const TASK_ATTACHMENT_COLUMNS =
  "id, entity, entity_id, storage_path, file_name, mime_type, file_size, uploaded_by, sort_order, created_at";

export type TaskAttachmentRecord = {
  id: string;
  entity: TaskAttachmentEntity;
  entity_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  uploaded_by: string | null;
  sort_order: number;
  created_at: string;
};

export type CreateTaskAttachmentInput = {
  entity: TaskAttachmentEntity;
  entity_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  uploaded_by?: string | null;
  sort_order?: number;
};

export async function listTaskAttachmentsByEntity(
  client: Supabase,
  entity: TaskAttachmentEntity,
  entityId: string
) {
  return client
    .from("task_attachments")
    .select(TASK_ATTACHMENT_COLUMNS)
    .eq("entity", entity)
    .eq("entity_id", entityId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
}

export async function listTaskAttachmentsByEntityIds(
  client: Supabase,
  entity: TaskAttachmentEntity,
  entityIds: string[]
) {
  if (entityIds.length === 0) {
    return { data: [] as TaskAttachmentRecord[], error: null };
  }

  return client
    .from("task_attachments")
    .select(TASK_ATTACHMENT_COLUMNS)
    .eq("entity", entity)
    .in("entity_id", entityIds)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
}

export async function countTaskAttachmentsByEntity(
  client: Supabase,
  entity: TaskAttachmentEntity,
  entityId: string
) {
  return client
    .from("task_attachments")
    .select("id", { count: "exact", head: true })
    .eq("entity", entity)
    .eq("entity_id", entityId);
}

export async function findTaskAttachmentById(client: Supabase, id: string) {
  return client
    .from("task_attachments")
    .select(TASK_ATTACHMENT_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

export async function createTaskAttachment(
  client: Supabase,
  input: CreateTaskAttachmentInput
) {
  return client
    .from("task_attachments")
    .insert({
      entity: input.entity,
      entity_id: input.entity_id,
      storage_path: input.storage_path,
      file_name: input.file_name,
      mime_type: input.mime_type,
      file_size: input.file_size,
      uploaded_by: input.uploaded_by ?? null,
      sort_order: input.sort_order ?? 0,
    })
    .select(TASK_ATTACHMENT_COLUMNS)
    .single();
}

export async function deleteTaskAttachmentById(client: Supabase, id: string) {
  return client.from("task_attachments").delete().eq("id", id);
}

export async function deleteTaskAttachmentsByEntity(
  client: Supabase,
  entity: TaskAttachmentEntity,
  entityId: string
) {
  return client
    .from("task_attachments")
    .delete()
    .eq("entity", entity)
    .eq("entity_id", entityId)
    .select("id, storage_path");
}

export async function listTaskAttachmentStoragePathsByEntityIds(
  client: Supabase,
  entity: TaskAttachmentEntity,
  entityIds: string[]
) {
  if (entityIds.length === 0) {
    return { data: [] as { id: string; storage_path: string }[], error: null };
  }

  return client
    .from("task_attachments")
    .select("id, storage_path")
    .eq("entity", entity)
    .in("entity_id", entityIds);
}
