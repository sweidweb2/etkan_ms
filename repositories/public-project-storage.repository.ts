import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PROJECTS_STORAGE_BUCKET,
  splitProjectImageStoragePath,
} from "@/lib/manager/projects/storage-path";
import {
  getObjectPublicUrl,
  removeObjects,
  uploadObject,
  type StorageObjectBody,
} from "@/repositories/object-storage.repository";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export async function uploadPublicProjectImage(
  client: Supabase,
  storagePath: string,
  body: StorageObjectBody,
  contentType: string
): Promise<{ error: { message: string } | null }> {
  const { objectPath } = splitProjectImageStoragePath(storagePath);
  return uploadObject(
    client,
    PROJECTS_STORAGE_BUCKET,
    objectPath,
    body,
    contentType
  );
}

export function getPublicProjectImageUrl(
  client: Supabase,
  storagePath: string
): string {
  const { objectPath } = splitProjectImageStoragePath(storagePath);
  return getObjectPublicUrl(client, PROJECTS_STORAGE_BUCKET, objectPath);
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

  return removeObjects(client, PROJECTS_STORAGE_BUCKET, objectPaths);
}
