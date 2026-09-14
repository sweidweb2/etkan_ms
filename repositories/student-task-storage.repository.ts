import type { SupabaseClient } from "@supabase/supabase-js";
import {
  STUDENT_TASK_UPLOADS_STORAGE_BUCKET,
  STUDENT_TASK_UPLOAD_SIGNED_URL_EXPIRES_SECONDS,
} from "@/lib/constants/manager-student-task-uploads";
import { splitStudentTaskUploadStoragePath } from "@/lib/manager/student-tasks/storage-path";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

/**
 * Upload a student task file to the private `student-task-uploads` bucket.
 * `storagePath` is the DB value (`student-task-uploads/{studentTaskId}/{file}`).
 */
export async function uploadStudentTaskStorageObject(
  client: Supabase,
  storagePath: string,
  body: Blob | ArrayBuffer | File | Buffer,
  contentType: string
): Promise<{ error: { message: string } | null }> {
  const { objectPath } = splitStudentTaskUploadStoragePath(storagePath);

  const { error } = await client.storage
    .from(STUDENT_TASK_UPLOADS_STORAGE_BUCKET)
    .upload(objectPath, body, {
      contentType,
      upsert: false,
    });

  if (error) {
    return { error: { message: error.message } };
  }

  return { error: null };
}

/**
 * Remove student task upload objects from the private bucket.
 * `storagePaths` are DB values.
 */
export async function removeStudentTaskStorageObjects(
  client: Supabase,
  storagePaths: string[]
): Promise<{ error: { message: string } | null }> {
  if (storagePaths.length === 0) {
    return { error: null };
  }

  const objectPaths = storagePaths.map(
    (path) => splitStudentTaskUploadStoragePath(path).objectPath
  );

  const { error } = await client.storage
    .from(STUDENT_TASK_UPLOADS_STORAGE_BUCKET)
    .remove(objectPaths);

  if (error) {
    return { error: { message: error.message } };
  }

  return { error: null };
}

export async function createStudentTaskUploadSignedUrl(
  client: Supabase,
  storagePath: string,
  expiresInSeconds = STUDENT_TASK_UPLOAD_SIGNED_URL_EXPIRES_SECONDS
): Promise<{
  data: { signedUrl: string } | null;
  error: { message: string } | null;
}> {
  const { objectPath } = splitStudentTaskUploadStoragePath(storagePath);

  const { data, error } = await client.storage
    .from(STUDENT_TASK_UPLOADS_STORAGE_BUCKET)
    .createSignedUrl(objectPath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    return {
      data: null,
      error: { message: error?.message ?? "Unable to create signed URL." },
    };
  }

  return { data: { signedUrl: data.signedUrl }, error: null };
}
