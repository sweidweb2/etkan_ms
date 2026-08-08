import type { SupabaseClient } from "@supabase/supabase-js";
import {
  REGISTRATION_STORAGE_BUCKET,
  splitRegistrationStoragePath,
} from "@/lib/public/registration/storage-path";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export async function uploadRegistrationStorageObject(
  client: Supabase,
  storagePath: string,
  body: Blob | ArrayBuffer | File | Buffer,
  contentType: string
): Promise<{ error: { message: string } | null }> {
  const { objectPath } = splitRegistrationStoragePath(storagePath);

  const { error } = await client.storage
    .from(REGISTRATION_STORAGE_BUCKET)
    .upload(objectPath, body, {
      contentType,
      upsert: false,
    });

  if (error) {
    return { error: { message: error.message } };
  }

  return { error: null };
}

export async function removeRegistrationStorageObjects(
  client: Supabase,
  storagePaths: string[]
): Promise<{ error: { message: string } | null }> {
  if (storagePaths.length === 0) {
    return { error: null };
  }

  const objectPaths = storagePaths.map(
    (path) => splitRegistrationStoragePath(path).objectPath
  );

  const { error } = await client.storage
    .from(REGISTRATION_STORAGE_BUCKET)
    .remove(objectPaths);

  if (error) {
    return { error: { message: error.message } };
  }

  return { error: null };
}

/**
 * Copy temp object to final path, then remove temp.
 */
export async function moveRegistrationStorageObject(
  client: Supabase,
  fromStoragePath: string,
  toStoragePath: string
): Promise<{ error: { message: string } | null }> {
  const from = splitRegistrationStoragePath(fromStoragePath);
  const to = splitRegistrationStoragePath(toStoragePath);

  const { error: copyError } = await client.storage
    .from(REGISTRATION_STORAGE_BUCKET)
    .copy(from.objectPath, to.objectPath);

  if (copyError) {
    return { error: { message: copyError.message } };
  }

  const { error: removeError } = await client.storage
    .from(REGISTRATION_STORAGE_BUCKET)
    .remove([from.objectPath]);

  if (removeError) {
    // Best-effort cleanup of destination if temp delete fails after copy.
    await client.storage
      .from(REGISTRATION_STORAGE_BUCKET)
      .remove([to.objectPath]);
    return { error: { message: removeError.message } };
  }

  return { error: null };
}

export async function createRegistrationDocumentSignedUrl(
  client: Supabase,
  storagePath: string,
  expiresInSeconds = 60 * 10
): Promise<{ data: { signedUrl: string } | null; error: { message: string } | null }> {
  const { objectPath } = splitRegistrationStoragePath(storagePath);

  const { data, error } = await client.storage
    .from(REGISTRATION_STORAGE_BUCKET)
    .createSignedUrl(objectPath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    return {
      data: null,
      error: { message: error?.message ?? "Unable to create signed URL." },
    };
  }

  return { data: { signedUrl: data.signedUrl }, error: null };
}
