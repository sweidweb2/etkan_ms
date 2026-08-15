import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PROJECTS_STORAGE_BUCKET,
  splitProjectImageStoragePath,
} from "@/lib/manager/projects/storage-path";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export async function uploadPublicProjectImage(
  client: Supabase,
  storagePath: string,
  body: Blob | ArrayBuffer | File | Buffer,
  contentType: string
): Promise<{ error: { message: string } | null }> {
  const { objectPath } = splitProjectImageStoragePath(storagePath);

  const { error } = await client.storage
    .from(PROJECTS_STORAGE_BUCKET)
    .upload(objectPath, body, {
      contentType,
      upsert: false,
    });

  if (error) {
    return { error: { message: error.message } };
  }

  return { error: null };
}

export function getPublicProjectImageUrl(
  client: Supabase,
  storagePath: string
): string {
  const { objectPath } = splitProjectImageStoragePath(storagePath);
  const { data } = client.storage
    .from(PROJECTS_STORAGE_BUCKET)
    .getPublicUrl(objectPath);
  return data.publicUrl;
}

export async function removePublicProjectImages(
  client: Supabase,
  storagePaths: string[]
): Promise<{ error: { message: string } | null }> {
  if (storagePaths.length === 0) {
    return { error: null };
  }

  const objectPaths = storagePaths.map(
    (path) => splitProjectImageStoragePath(path).objectPath
  );

  const { error } = await client.storage
    .from(PROJECTS_STORAGE_BUCKET)
    .remove(objectPaths);

  if (error) {
    return { error: { message: error.message } };
  }

  return { error: null };
}
