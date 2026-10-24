import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export type StorageListedObject = {
  name: string;
  path: string;
  id: string | null;
  size: number | null;
  contentType: string | null;
};

function asContentType(metadata: Record<string, unknown> | null): string | null {
  const mime = metadata?.mimetype;
  return typeof mime === "string" && mime.trim() ? mime : null;
}

function asSize(metadata: Record<string, unknown> | null): number | null {
  const size = metadata?.size;
  return typeof size === "number" && Number.isFinite(size) ? size : null;
}

export async function listStorageObjects(
  client: Supabase,
  bucket: string,
  folderPath: string,
  options: { limit: number; offset: number }
): Promise<{
  data: StorageListedObject[] | null;
  error: { message: string } | null;
}> {
  const { data, error } = await client.storage.from(bucket).list(folderPath, {
    limit: options.limit,
    offset: options.offset,
    sortBy: { column: "name", order: "asc" },
  });

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  const items = (data ?? []).map((item) => {
    const metadata =
      item.metadata && typeof item.metadata === "object"
        ? (item.metadata as Record<string, unknown>)
        : null;
    const path = folderPath ? `${folderPath}/${item.name}` : item.name;

    return {
      name: item.name,
      path,
      id: item.id ?? null,
      size: asSize(metadata),
      contentType: asContentType(metadata),
    };
  });

  return { data: items, error: null };
}

export async function downloadStorageObject(
  client: Supabase,
  bucket: string,
  path: string
): Promise<{ data: Blob | null; error: { message: string } | null }> {
  const { data, error } = await client.storage.from(bucket).download(path);

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  return { data, error: null };
}
