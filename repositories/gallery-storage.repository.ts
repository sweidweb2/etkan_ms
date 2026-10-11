import type { SupabaseClient } from "@supabase/supabase-js";
import {
  GALLERY_STORAGE_BUCKET,
  splitGalleryImageStoragePath,
} from "@/lib/manager/gallery/storage-path";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

function toUploadBlob(
  body: Blob | ArrayBuffer | File | Buffer | Uint8Array,
  contentType: string
): Blob {
  // Avoid Node Buffer in fetch/undici — some paths UTF-8-decode binary
  // (bytes become U+FFFD / ef bf bd) and produce corrupt WebP objects.
  if (body instanceof Blob) {
    return body;
  }
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(body)) {
    return new Blob([new Uint8Array(body)], { type: contentType });
  }
  if (body instanceof Uint8Array) {
    return new Blob([body], { type: contentType });
  }
  return new Blob([body], { type: contentType });
}

export async function uploadGalleryImage(
  client: Supabase,
  storagePath: string,
  body: Blob | ArrayBuffer | File | Buffer | Uint8Array,
  contentType: string
): Promise<{ error: { message: string } | null }> {
  const { objectPath } = splitGalleryImageStoragePath(storagePath);
  const uploadBody = toUploadBlob(body, contentType);

  const { error } = await client.storage
    .from(GALLERY_STORAGE_BUCKET)
    .upload(objectPath, uploadBody, {
      contentType,
      upsert: false,
    });

  if (error) {
    return { error: { message: error.message } };
  }

  return { error: null };
}

export function getGalleryImagePublicUrl(
  client: Supabase,
  storagePath: string
): string {
  const { objectPath } = splitGalleryImageStoragePath(storagePath);
  const { data } = client.storage
    .from(GALLERY_STORAGE_BUCKET)
    .getPublicUrl(objectPath);
  return data.publicUrl;
}

export async function removeGalleryImages(
  client: Supabase,
  storagePaths: string[]
): Promise<{ error: { message: string } | null }> {
  if (storagePaths.length === 0) {
    return { error: null };
  }

  const objectPaths = storagePaths.map(
    (path) => splitGalleryImageStoragePath(path).objectPath
  );

  const { error } = await client.storage
    .from(GALLERY_STORAGE_BUCKET)
    .remove(objectPaths);

  if (error) {
    return { error: { message: error.message } };
  }

  return { error: null };
}
