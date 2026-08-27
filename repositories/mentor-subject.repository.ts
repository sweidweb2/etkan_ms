import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const MENTOR_SUBJECT_COLUMNS = "id, name, sort_order, created_at";

export type MentorSubjectRecord = {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
};

export async function listMentorSubjects(client: Supabase) {
  return client
    .from("mentor_subjects")
    .select(MENTOR_SUBJECT_COLUMNS)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
}

export async function listMentorSubjectIds(client: Supabase) {
  return client.from("mentor_subjects").select("id");
}

export async function findMentorSubjectById(client: Supabase, id: string) {
  return client
    .from("mentor_subjects")
    .select(MENTOR_SUBJECT_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

export async function findMentorSubjectByName(client: Supabase, name: string) {
  return client
    .from("mentor_subjects")
    .select("id, name")
    .ilike("name", name)
    .maybeSingle();
}

export async function getMaxMentorSubjectSortOrder(client: Supabase) {
  return client
    .from("mentor_subjects")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
}

export async function createMentorSubject(
  client: Supabase,
  input: { name: string; sort_order: number }
) {
  return client
    .from("mentor_subjects")
    .insert({
      name: input.name,
      sort_order: input.sort_order,
    })
    .select(MENTOR_SUBJECT_COLUMNS)
    .single();
}

export async function updateMentorSubjectById(
  client: Supabase,
  id: string,
  input: { name: string }
) {
  return client
    .from("mentor_subjects")
    .update({ name: input.name })
    .eq("id", id)
    .select(MENTOR_SUBJECT_COLUMNS)
    .single();
}

export async function updateMentorSubjectSortOrder(
  client: Supabase,
  id: string,
  sortOrder: number
) {
  return client
    .from("mentor_subjects")
    .update({ sort_order: sortOrder })
    .eq("id", id);
}

export async function deleteMentorSubjectById(client: Supabase, id: string) {
  return client.from("mentor_subjects").delete().eq("id", id);
}
