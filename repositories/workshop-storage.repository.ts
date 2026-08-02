import type { SupabaseClient } from "@supabase/supabase-js";
import {
  WORKSHOPS_STORAGE_BUCKET,
  splitWorkshopDocumentStoragePath,
} from "@/lib/manager/workshops/storage-path";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

/**
 * Upload a workshop document object to the public `workshops` bucket.
 * `storagePath` is the DB value (`workshops/{workshopId}/{file}`).
 */
export async function uploadWorkshopStorageObject(
  client: Supabase,
  storagePath: string,
  body: Blob | ArrayBuffer | File | Buffer,
  contentType: string
): Promise<{ error: { message: string } | null }> {
  const { objectPath } = splitWorkshopDocumentStoragePath(storagePath);

  const { error } = await client.storage
    .from(WORKSHOPS_STORAGE_BUCKET)
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

  const { error } = await client.storage
    .from(WORKSHOPS_STORAGE_BUCKET)
    .remove(objectPaths);

  if (error) {
    return { error: { message: error.message } };
  }

  return { error: null };
}
