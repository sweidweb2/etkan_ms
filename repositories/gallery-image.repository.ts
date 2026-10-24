import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const GALLERY_IMAGE_COLUMNS =
  "id, name, storage_path, created_at, updated_at";

export type GalleryImageRecord = {
  id: string;
  name: string;
  storage_path: string;
  created_at: string;
  updated_at: string;
};

export type CreateGalleryImageRecordInput = {
  name: string;
  storage_path: string;
};

export type UpdateGalleryImageRecordInput = CreateGalleryImageRecordInput;

export type ListGalleryImagesPageInput = {
  page: number;
  pageSize: number;
  search: string;
};

function nameSearchTerm(search: string): string {
  return search.trim().replace(/[%_,]/g, "");
}

export async function listGalleryImagesPage(
  client: Supabase,
  input: ListGalleryImagesPageInput
) {
  const from = (input.page - 1) * input.pageSize;
  const to = from + input.pageSize - 1;
  const term = nameSearchTerm(input.search);

  let query = client
    .from("gallery_images")
    .select(GALLERY_IMAGE_COLUMNS, { count: "exact" });

  if (term) {
    query = query.ilike("name", `%${term}%`);
  }

  return query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);
}

export async function countGalleryImages(client: Supabase) {
  return client
    .from("gallery_images")
    .select("id", { count: "exact", head: true });
}

/** Newest rows for the public marquee. Callers pass the cap. */
export async function listPublicGalleryImages(
  client: Supabase,
  limit: number
) {
  return client
    .from("gallery_images")
    .select(GALLERY_IMAGE_COLUMNS)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);
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
      storage_path: input.storage_path,
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
      storage_path: input.storage_path,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(GALLERY_IMAGE_COLUMNS)
    .single();
}

export async function deleteGalleryImageById(client: Supabase, id: string) {
  return client.from("gallery_images").delete().eq("id", id);
}
