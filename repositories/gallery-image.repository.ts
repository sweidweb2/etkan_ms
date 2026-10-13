import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const GALLERY_IMAGE_COLUMNS =
  "id, name, direct_url, created_at, updated_at";

export type GalleryImageRecord = {
  id: string;
  name: string;
  direct_url: string;
  created_at: string;
  updated_at: string;
};

export type CreateGalleryImageRecordInput = {
  name: string;
  direct_url: string;
};

export type UpdateGalleryImageRecordInput = CreateGalleryImageRecordInput;

export async function listGalleryImages(client: Supabase) {
  return client
    .from("gallery_images")
    .select(GALLERY_IMAGE_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(200);
}

export async function findGalleryImageById(client: Supabase, id: string) {
  return client
    .from("gallery_images")
    .select(GALLERY_IMAGE_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

export async function createGalleryImage(
  client: Supabase,
  input: CreateGalleryImageRecordInput
) {
  return client
    .from("gallery_images")
    .insert({
      name: input.name,
      direct_url: input.direct_url,
    })
    .select(GALLERY_IMAGE_COLUMNS)
    .single();
}

export async function updateGalleryImage(
  client: Supabase,
  id: string,
  input: UpdateGalleryImageRecordInput
) {
  return client
    .from("gallery_images")
    .update({
      name: input.name,
      direct_url: input.direct_url,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(GALLERY_IMAGE_COLUMNS)
    .single();
}

export async function deleteGalleryImageById(client: Supabase, id: string) {
  return client.from("gallery_images").delete().eq("id", id);
}

export async function bulkInsertGalleryImages(
  client: Supabase,
  rows: CreateGalleryImageRecordInput[]
) {
  if (rows.length === 0) {
    return { data: [], error: null };
  }

  return client
    .from("gallery_images")
    .upsert(rows, { onConflict: "direct_url", ignoreDuplicates: true })
    .select(GALLERY_IMAGE_COLUMNS);
}

/** Stay at or under PostgREST `max_rows` so seed/migrate lists are complete. */
const GALLERY_LIST_PAGE_SIZE = 1000;

async function collectGalleryPages<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{
    data: T[] | null;
    error: { message: string } | null;
  }>
) {
  const rows: T[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await fetchPage(
      offset,
      offset + GALLERY_LIST_PAGE_SIZE - 1
    );

    if (error) {
      return { data: null, error };
    }

    const page = data ?? [];
    rows.push(...page);

    if (page.length < GALLERY_LIST_PAGE_SIZE) {
      return { data: rows, error: null };
    }

    offset += GALLERY_LIST_PAGE_SIZE;
  }
}

export async function listExistingDirectUrls(client: Supabase) {
  return collectGalleryPages<{ direct_url: string }>((from, to) =>
    client
      .from("gallery_images")
      .select("direct_url")
      .order("id", { ascending: true })
      .range(from, to)
      .then((result) => ({
        data: result.data,
        error: result.error,
      }))
  );
}

/** Full list for seed/migrate scripts (no UI page limit). */
export async function listAllGalleryImages(client: Supabase) {
  return collectGalleryPages<{
    id: string;
    name: string;
    direct_url: string;
  }>((from, to) =>
    client
      .from("gallery_images")
      .select("id, name, direct_url")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, to)
      .then((result) => ({
        data: result.data,
        error: result.error,
      }))
  );
}
