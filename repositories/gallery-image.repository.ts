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

export async function listExistingDirectUrls(client: Supabase) {
  return client.from("gallery_images").select("direct_url");
}

/** Full list for seed/migrate scripts (no UI page limit). */
export async function listAllGalleryImages(client: Supabase) {
  return client
    .from("gallery_images")
    .select("id, name, direct_url")
    .order("created_at", { ascending: false });
}
