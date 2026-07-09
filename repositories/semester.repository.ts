import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const SEMESTER_COLUMNS = "id, name, nb_courses, amount, created_at";

export type SemesterRecord = {
  id: string;
  name: string;
  nb_courses: number;
  amount: number;
  created_at: string | null;
};

export type CreateSemesterRecordInput = {
  name: string;
  nb_courses?: number;
  amount?: number;
};

export async function listSemesters(client: Supabase) {
  return client
    .from("semesters")
    .select(SEMESTER_COLUMNS)
    .order("created_at", { ascending: false });
}

export async function findSemesterById(client: Supabase, id: string) {
  return client
    .from("semesters")
    .select(SEMESTER_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

export async function findSemesterByName(client: Supabase, name: string) {
  return client
    .from("semesters")
    .select("id, name")
    .ilike("name", name)
    .maybeSingle();
}

export async function createSemester(
  client: Supabase,
  input: CreateSemesterRecordInput
) {
  return client
    .from("semesters")
    .insert({
      name: input.name,
      nb_courses: input.nb_courses ?? 0,
      amount: input.amount ?? 0,
    })
    .select(SEMESTER_COLUMNS)
    .single();
}

export async function updateSemesterNbCourses(
  client: Supabase,
  id: string,
  nbCourses: number
) {
  return client
    .from("semesters")
    .update({ nb_courses: nbCourses })
    .eq("id", id)
    .select(SEMESTER_COLUMNS)
    .single();
}
