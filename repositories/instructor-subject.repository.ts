import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const INSTRUCTOR_SUBJECT_COLUMNS = "id, name, sort_order, created_at";

export type InstructorSubjectRecord = {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
};

export async function listInstructorSubjects(client: Supabase) {
  return client
    .from("instructor_subjects")
    .select(INSTRUCTOR_SUBJECT_COLUMNS)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
}

export async function listInstructorSubjectIds(client: Supabase) {
  return client.from("instructor_subjects").select("id");
}

export async function findInstructorSubjectById(client: Supabase, id: string) {
  return client
    .from("instructor_subjects")
    .select(INSTRUCTOR_SUBJECT_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

export async function findInstructorSubjectByName(
  client: Supabase,
  name: string
) {
  return client
    .from("instructor_subjects")
    .select("id, name")
    .ilike("name", name)
    .maybeSingle();
}

export async function getMaxInstructorSubjectSortOrder(client: Supabase) {
  return client
    .from("instructor_subjects")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
}

export async function createInstructorSubject(
  client: Supabase,
  input: { name: string; sort_order: number }
) {
  return client
    .from("instructor_subjects")
    .insert({
      name: input.name,
      sort_order: input.sort_order,
    })
    .select(INSTRUCTOR_SUBJECT_COLUMNS)
    .single();
}

export async function updateInstructorSubjectById(
  client: Supabase,
  id: string,
  input: { name: string }
) {
  return client
    .from("instructor_subjects")
    .update({ name: input.name })
    .eq("id", id)
    .select(INSTRUCTOR_SUBJECT_COLUMNS)
    .single();
}

export async function reorderInstructorSubjects(
  client: Supabase,
  orderedIds: string[]
) {
  return client.rpc("reorder_instructor_subjects", {
    p_ordered_ids: orderedIds,
  });
}

export async function deleteInstructorSubjectById(
  client: Supabase,
  id: string
) {
  return client.from("instructor_subjects").delete().eq("id", id);
}
