import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export type StorageObjectBody =
  | Blob
  | ArrayBuffer
  | File
  | Buffer
  | Uint8Array;

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return copy;
}

/**
 * Copy binary into a Blob. Passing a Node Buffer straight to fetch can
 * UTF-8-decode the bytes and store a corrupt object.
 */
function toUploadBlob(body: StorageObjectBody, contentType: string): Blob {
  if (body instanceof Blob) {
    return body;
  }
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(body)) {
    return new Blob([toArrayBuffer(body)], { type: contentType });
  }
  if (body instanceof Uint8Array) {
    return new Blob([toArrayBuffer(body)], { type: contentType });
  }
  return new Blob([body], { type: contentType });
}

export async function uploadObject(
  client: Supabase,
  bucket: string,
  objectPath: string,
  body: StorageObjectBody,
  contentType: string,
  options?: { upsert?: boolean }
): Promise<{ error: { message: string } | null }> {
  const { error } = await client.storage.from(bucket).upload(
    objectPath,
    toUploadBlob(body, contentType),
    {
      contentType,
      upsert: options?.upsert ?? false,
    }
  );

  if (error) {
    return { error: { message: error.message } };
  }

  return { error: null };
}

export function getObjectPublicUrl(
  client: Supabase,
  bucket: string,
  objectPath: string
): string {
  const { data } = client.storage.from(bucket).getPublicUrl(objectPath);
  return data.publicUrl;
}

export async function removeObjects(
  client: Supabase,
  bucket: string,
  objectPaths: string[]
): Promise<{ error: { message: string } | null }> {
  if (objectPaths.length === 0) {
    return { error: null };
  }

  const { error } = await client.storage.from(bucket).remove(objectPaths);

  if (error) {
    return { error: { message: error.message } };
  }

  return { error: null };
}

export async function downloadObject(
  client: Supabase,
  bucket: string,
  objectPath: string
): Promise<{ data: Blob | null; error: { message: string } | null }> {
  const { data, error } = await client.storage.from(bucket).download(objectPath);

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  return { data, error: null };
}
