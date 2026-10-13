import type { SupabaseClient } from "@supabase/supabase-js";
import {
  WORKSHOPS_STORAGE_BUCKET,
  splitWorkshopDocumentStoragePath,
} from "@/lib/manager/workshops/storage-path";
import {
  removeObjects,
  uploadObject,
  type StorageObjectBody,
} from "@/repositories/object-storage.repository";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

/**
 * Upload a workshop document object to the public `workshops` bucket.
 * `storagePath` is the DB value (`workshops/{workshopId}/{file}`).
 */
export async function uploadWorkshopStorageObject(
  client: Supabase,
  storagePath: string,
  body: StorageObjectBody,
  contentType: string
): Promise<{ error: { message: string } | null }> {
  const { objectPath } = splitWorkshopDocumentStoragePath(storagePath);
  return uploadObject(
    client,
    WORKSHOPS_STORAGE_BUCKET,
    objectPath,
    body,
    contentType
  );
}

/**
 * Remove workshop document objects from the public `workshops` bucket.
 * `storagePaths` are DB values (`workshops/{workshopId}/{file}`).
 */
export async function removeWorkshopStorageObjects(
  client: Supabase,
  storagePaths: string[]
): Promise<{ error: { message: string } | null }> {
  if (storagePaths.length === 0) {
    return { error: null };
  }

  const objectPaths = storagePaths.map(
    (path) => splitWorkshopDocumentStoragePath(path).objectPath
  );

  return removeObjects(client, WORKSHOPS_STORAGE_BUCKET, objectPaths);
}
