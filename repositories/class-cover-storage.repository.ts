import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CLASS_COVERS_STORAGE_BUCKET,
  splitClassCoverStoragePath,
} from "@/lib/manager/classes/storage-path";
import {
  getObjectPublicUrl,
  removeObjects,
  uploadObject,
  type StorageObjectBody,
} from "@/repositories/object-storage.repository";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export async function uploadClassCover(
  client: Supabase,
  storagePath: string,
  body: StorageObjectBody
): Promise<{ error: { message: string } | null }> {
  const { objectPath } = splitClassCoverStoragePath(storagePath);
  return uploadObject(
    client,
    CLASS_COVERS_STORAGE_BUCKET,
    objectPath,
    body,
    "image/webp"
  );
}

export function getClassCoverPublicUrl(
  client: Supabase,
  storagePath: string
): string {
  const { objectPath } = splitClassCoverStoragePath(storagePath);
  return getObjectPublicUrl(client, CLASS_COVERS_STORAGE_BUCKET, objectPath);
}

export async function removeClassCovers(
  client: Supabase,
  storagePaths: string[]
): Promise<{ error: { message: string } | null }> {
  if (storagePaths.length === 0) {
    return { error: null };
  }

  const objectPaths = storagePaths.map(
    (path) => splitClassCoverStoragePath(path).objectPath
  );

  return removeObjects(client, CLASS_COVERS_STORAGE_BUCKET, objectPaths);
}
