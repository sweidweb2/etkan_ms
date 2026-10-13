import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AUTHOR_STORAGE_BUCKET,
  BLOGS_STORAGE_BUCKET,
  splitBlogImageStoragePath,
} from "@/lib/manager/blogs/storage-path";
import {
  getObjectPublicUrl,
  removeObjects,
  uploadObject,
  type StorageObjectBody,
} from "@/repositories/object-storage.repository";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

type BlogBucket =
  | typeof BLOGS_STORAGE_BUCKET
  | typeof AUTHOR_STORAGE_BUCKET;

export async function uploadBlogImage(
  client: Supabase,
  bucket: BlogBucket,
  storagePath: string,
  body: StorageObjectBody,
  contentType: string
): Promise<{ error: { message: string } | null }> {
  const { objectPath } = splitBlogImageStoragePath(storagePath, bucket);
  return uploadObject(client, bucket, objectPath, body, contentType);
}

export function getBlogImagePublicUrl(
  client: Supabase,
  bucket: BlogBucket,
  storagePath: string
): string {
  const { objectPath } = splitBlogImageStoragePath(storagePath, bucket);
  return getObjectPublicUrl(client, bucket, objectPath);
}

export async function removeBlogImages(
  client: Supabase,
  bucket: BlogBucket,
  storagePaths: string[]
): Promise<{ error: { message: string } | null }> {
  if (storagePaths.length === 0) {
    return { error: null };
  }

  const objectPaths = storagePaths.map(
    (path) => splitBlogImageStoragePath(path, bucket).objectPath
  );

  return removeObjects(client, bucket, objectPaths);
}
