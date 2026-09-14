import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AUTHOR_STORAGE_BUCKET,
  BLOGS_STORAGE_BUCKET,
  splitBlogImageStoragePath,
} from "@/lib/manager/blogs/storage-path";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

type BlogBucket =
  | typeof BLOGS_STORAGE_BUCKET
  | typeof AUTHOR_STORAGE_BUCKET;

export async function uploadBlogImage(
  client: Supabase,
  bucket: BlogBucket,
  storagePath: string,
  body: Blob | ArrayBuffer | File | Buffer,
  contentType: string
): Promise<{ error: { message: string } | null }> {
  const { objectPath } = splitBlogImageStoragePath(storagePath, bucket);

  const { error } = await client.storage.from(bucket).upload(objectPath, body, {
    contentType,
    upsert: false,
  });

  if (error) {
    return { error: { message: error.message } };
  }

  return { error: null };
}

export function getBlogImagePublicUrl(
  client: Supabase,
  bucket: BlogBucket,
  storagePath: string
): string {
  const { objectPath } = splitBlogImageStoragePath(storagePath, bucket);
  const { data } = client.storage.from(bucket).getPublicUrl(objectPath);
  return data.publicUrl;
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

  const { error } = await client.storage.from(bucket).remove(objectPaths);

  if (error) {
    return { error: { message: error.message } };
  }

  return { error: null };
}
