import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const SUBJECT_COLUMNS =
  "id, name, syllabus_link, reference_link, handout_link, nb_sessions, created_at";

export type SubjectRecord = {
  id: string;
  name: string;
  syllabus_link: string | null;
  reference_link: string | null;
  handout_link: string | null;
  nb_sessions: number;
  created_at: string | null;
};

export type CreateSubjectRecordInput = {
  name: string;
  syllabus_link?: string | null;
  reference_link?: string | null;
  handout_link?: string | null;
  nb_sessions?: number;
};

export type UpdateSubjectRecordInput = {
  name: string;
  syllabus_link: string | null;
  reference_link: string | null;
  handout_link: string | null;
  nb_sessions: number;
};

export async function listSubjects(client: Supabase) {
  return client
    .from("subjects")
    .select(SUBJECT_COLUMNS)
    .order("created_at", { ascending: false });
}

export async function findSubjectById(client: Supabase, id: string) {
  return client
    .from("subjects")
    .select(SUBJECT_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

export async function findSubjectByName(client: Supabase, name: string) {
  return client
    .from("subjects")
    .select("id, name")
    .ilike("name", name)
    .maybeSingle();
}

export async function createSubject(
  client: Supabase,
  input: CreateSubjectRecordInput
) {
  return client
    .from("subjects")
    .insert({
      name: input.name,
      syllabus_link: input.syllabus_link ?? null,
      reference_link: input.reference_link ?? null,
      handout_link: input.handout_link ?? null,
      nb_sessions: input.nb_sessions ?? 0,
    })
    .select(SUBJECT_COLUMNS)
    .single();
}

export async function updateSubjectById(
  client: Supabase,
  id: string,
  input: UpdateSubjectRecordInput
) {
  return client
    .from("subjects")
    .update({
      name: input.name,
      syllabus_link: input.syllabus_link,
      reference_link: input.reference_link,
      handout_link: input.handout_link,
      nb_sessions: input.nb_sessions,
    })
    .eq("id", id)
    .select(SUBJECT_COLUMNS)
    .single();
}

export async function deleteSubjectById(client: Supabase, id: string) {
  return client.from("subjects").delete().eq("id", id);
}
