import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { AVATARS_STORAGE_BUCKET } from "@/lib/avatars/storage-path";
import {
  getObjectPublicUrl,
  removeObjects,
  uploadObject,
  type StorageObjectBody,
} from "@/repositories/object-storage.repository";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export async function uploadAvatar(
  client: Supabase,
  objectPath: string,
  body: StorageObjectBody
): Promise<{ error: { message: string } | null }> {
  return uploadObject(
    client,
    AVATARS_STORAGE_BUCKET,
    objectPath,
    body,
    "image/webp"
  );
}

export function getAvatarPublicUrl(client: Supabase, objectPath: string): string {
  return getObjectPublicUrl(client, AVATARS_STORAGE_BUCKET, objectPath);
}

export async function removeAvatars(
  client: Supabase,
  objectPaths: string[]
): Promise<{ error: { message: string } | null }> {
  return removeObjects(client, AVATARS_STORAGE_BUCKET, objectPaths);
}
