import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import type { PublicProjectClassificationValue } from "@/lib/constants/manager-public-project";

type Supabase = SupabaseClient<Database>;

const PUBLIC_PROJECT_COLUMNS =
  "id, classification, category, title, body, author, image_url, href, created_at, updated_at";

export type PublicProjectRecord = {
  id: string;
  classification: string;
  category: string;
  title: string;
  body: string;
  author: string | null;
  image_url: string;
  href: string | null;
  created_at: string;
  updated_at: string;
};

export type CreatePublicProjectRecordInput = {
  classification: PublicProjectClassificationValue;
  category: string;
  title: string;
  body: string;
  author: string | null;
  image_url: string;
  href: string | null;
};

export type UpdatePublicProjectRecordInput = CreatePublicProjectRecordInput;

export async function listPublicProjects(client: Supabase) {
  return client
    .from("public_projects")
    .select(PUBLIC_PROJECT_COLUMNS)
    .order("created_at", { ascending: false });
}

export async function findPublicProjectById(client: Supabase, id: string) {
  return client
    .from("public_projects")
    .select(PUBLIC_PROJECT_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

export async function createPublicProject(
  client: Supabase,
  input: CreatePublicProjectRecordInput
) {
  return client
    .from("public_projects")
    .insert({
      classification: input.classification,
      category: input.category,
      title: input.title,
      body: input.body,
      author: input.author,
      image_url: input.image_url,
      href: input.href,
    })
    .select(PUBLIC_PROJECT_COLUMNS)
    .single();
}

export async function updatePublicProject(
  client: Supabase,
  id: string,
  input: UpdatePublicProjectRecordInput
) {
  return client
    .from("public_projects")
    .update({
      classification: input.classification,
      category: input.category,
      title: input.title,
      body: input.body,
      author: input.author,
      image_url: input.image_url,
      href: input.href,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(PUBLIC_PROJECT_COLUMNS)
    .single();
}

export async function deletePublicProjectById(client: Supabase, id: string) {
  return client.from("public_projects").delete().eq("id", id);
}
