import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const SEMESTER_COLUMNS = "id, name, semester_code, created_at";

export type SemesterRecord = {
  id: string;
  name: string;
  semester_code: string;
  created_at: string | null;
};

export type CreateSemesterRecordInput = {
  name: string;
  semester_code: string;
};

export type UpdateSemesterRecordInput = {
  name: string;
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

export type SemesterPaymentPhasePickerRecord = {
  id: string;
  name: string;
  semester_code: string;
};

export async function listSemestersForPaymentPhasePicker(client: Supabase) {
  return client
    .from("semesters")
    .select("id, name, semester_code")
    .not("semester_code", "is", null)
    .order("name", { ascending: true });
}

export async function findSemesterByName(client: Supabase, name: string) {
  return client
    .from("semesters")
    .select("id, name")
    .ilike("name", name)
    .maybeSingle();
}

export async function findSemesterByCode(client: Supabase, semesterCode: string) {
  return client
    .from("semesters")
    .select("id, semester_code")
    .eq("semester_code", semesterCode)
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
      semester_code: input.semester_code,
    })
    .select(SEMESTER_COLUMNS)
    .single();
}

export async function updateSemester(
  client: Supabase,
  id: string,
  input: UpdateSemesterRecordInput
) {
  return client
    .from("semesters")
    .update({
      name: input.name,
    })
    .eq("id", id)
    .select(SEMESTER_COLUMNS)
    .single();
}
