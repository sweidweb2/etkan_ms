import "server-only";

import {
  TASK_ATTACHMENTS_STORAGE_BUCKET,
  TASK_ATTACHMENT_SIGNED_URL_EXPIRES_SECONDS,
} from "@/lib/constants/task-attachments";
import { splitTaskAttachmentStoragePath } from "@/lib/manager/task-attachments/storage-path";
import {
  downloadObject,
  removeObjects,
  uploadObject,
  type StorageObjectBody,
} from "@/repositories/object-storage.repository";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

/**
 * Upload a task attachment to the private `task-attachments` bucket.
 * `storagePath` is the DB value (`task-attachments/{entity}/{entityId}/{file}`).
 */
export async function uploadTaskAttachmentStorageObject(
  client: Supabase,
  storagePath: string,
  body: StorageObjectBody,
  contentType: string,
  options?: { upsert?: boolean }
): Promise<{ error: { message: string } | null }> {
  const { objectPath } = splitTaskAttachmentStoragePath(storagePath);
  return uploadObject(
    client,
    TASK_ATTACHMENTS_STORAGE_BUCKET,
    objectPath,
    body,
    contentType,
    options
  );
}

/**
 * Remove task attachment objects from the private bucket.
 * `storagePaths` are DB values.
 */
export async function removeTaskAttachmentStorageObjects(
  client: Supabase,
  storagePaths: string[]
): Promise<{ error: { message: string } | null }> {
  if (storagePaths.length === 0) {
    return { error: null };
  }

  const objectPaths = storagePaths.map(
    (path) => splitTaskAttachmentStoragePath(path).objectPath
  );

  return removeObjects(client, TASK_ATTACHMENTS_STORAGE_BUCKET, objectPaths);
}

export async function createTaskAttachmentSignedUrl(
  client: Supabase,
  storagePath: string,
  expiresInSeconds = TASK_ATTACHMENT_SIGNED_URL_EXPIRES_SECONDS
): Promise<{
  data: { signedUrl: string } | null;
  error: { message: string } | null;
}> {
  const { objectPath } = splitTaskAttachmentStoragePath(storagePath);

  const { data, error } = await client.storage
    .from(TASK_ATTACHMENTS_STORAGE_BUCKET)
    .createSignedUrl(objectPath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    return {
      data: null,
      error: { message: error?.message ?? "Unable to create signed URL." },
    };
  }

  return { data: { signedUrl: data.signedUrl }, error: null };
}

/**
 * Download a task attachment object.
 * `storagePath` is the DB value.
 */
export async function downloadTaskAttachmentStorageObject(
  client: Supabase,
  storagePath: string
): Promise<{ data: Blob | null; error: { message: string } | null }> {
  const { objectPath } = splitTaskAttachmentStoragePath(storagePath);
  return downloadObject(client, TASK_ATTACHMENTS_STORAGE_BUCKET, objectPath);
}
