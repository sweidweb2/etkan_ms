import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const RELATIONSHIP_COLUMNS =
  "id, name, phone, relation_with, major, speciality, is_useful, created_at";

export type RelationshipRecord = {
  id: string;
  name: string;
  phone: string | null;
  relation_with: string | null;
  major: string | null;
  speciality: string | null;
  is_useful: boolean | null;
  created_at: string | null;
};

export type CreateRelationshipRecordInput = {
  name: string;
  phone?: string | null;
  relation_with?: string | null;
  major?: string | null;
  speciality?: string | null;
  is_useful?: boolean;
};

export type UpdateRelationshipRecordInput = CreateRelationshipRecordInput;

export async function listRelationships(client: Supabase) {
  return client
    .from("relationships")
    .select(RELATIONSHIP_COLUMNS)
    .order("created_at", { ascending: false });
}

export async function findRelationshipById(client: Supabase, id: string) {
  return client
    .from("relationships")
    .select(RELATIONSHIP_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

export async function createRelationship(
  client: Supabase,
  input: CreateRelationshipRecordInput
) {
  return client
    .from("relationships")
    .insert({
      name: input.name,
      phone: input.phone ?? null,
      relation_with: input.relation_with ?? null,
      major: input.major ?? null,
      speciality: input.speciality ?? null,
      is_useful: input.is_useful ?? true,
    })
    .select(RELATIONSHIP_COLUMNS)
    .single();
}

export async function updateRelationship(
  client: Supabase,
  id: string,
  input: UpdateRelationshipRecordInput
) {
  return client
    .from("relationships")
    .update({
      name: input.name,
      phone: input.phone ?? null,
      relation_with: input.relation_with ?? null,
      major: input.major ?? null,
      speciality: input.speciality ?? null,
      is_useful: input.is_useful ?? true,
    })
    .eq("id", id)
    .select(RELATIONSHIP_COLUMNS)
    .single();
}
