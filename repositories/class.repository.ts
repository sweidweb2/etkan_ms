import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const CLASS_COLUMNS =
  "id, subject_id, name, status, semester_id, created_at";

export type ClassRecord = {
  id: string;
  subject_id: string | null;
  name: string;
  status: string | null;
  semester_id: string | null;
  created_at: string | null;
};

const CLASS_LIST_COLUMNS = "id, name";

export async function listClasses(client: Supabase) {
  return client
    .from("classes")
    .select(CLASS_LIST_COLUMNS)
    .order("name", { ascending: true });
}

export async function listClassSubjectIds(client: Supabase) {
  return client.from("classes").select("subject_id");
}

export async function listClassesBySubjectId(client: Supabase, subjectId: string) {
  return client
    .from("classes")
    .select(CLASS_COLUMNS)
    .eq("subject_id", subjectId)
    .order("created_at", { ascending: false });
}

export async function countClassesBySubjectId(client: Supabase, subjectId: string) {
  return client
    .from("classes")
    .select("id", { count: "exact", head: true })
    .eq("subject_id", subjectId);
}

export async function listClassesBySemesterId(client: Supabase, semesterId: string) {
  return client
    .from("classes")
    .select(CLASS_COLUMNS)
    .eq("semester_id", semesterId)
    .order("created_at", { ascending: false });
}

export async function countClassesBySemesterId(client: Supabase, semesterId: string) {
  return client
    .from("classes")
    .select("id", { count: "exact", head: true })
    .eq("semester_id", semesterId);
}

const CLASS_WITH_SUBJECT_SELECT =
  "id, subject_id, name, status, semester_id, created_at, subjects ( name, nb_sessions )";

export type ClassWithSubjectRecord = ClassRecord & {
  subjects: { name: string; nb_sessions: number } | null;
};

export async function findClassById(client: Supabase, id: string) {
  return client
    .from("classes")
    .select(CLASS_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

export async function listClassesWithSubjectBySemesterId(
  client: Supabase,
  semesterId: string
) {
  return client
    .from("classes")
    .select(CLASS_WITH_SUBJECT_SELECT)
    .eq("semester_id", semesterId)
    .order("created_at", { ascending: false });
}

export async function listUnlinkedClassesWithSubject(client: Supabase) {
  return client
    .from("classes")
    .select(CLASS_WITH_SUBJECT_SELECT)
    .is("semester_id", null)
    .order("created_at", { ascending: false });
}

export async function updateClassSemesterId(
  client: Supabase,
  classId: string,
  semesterId: string
) {
  return client
    .from("classes")
    .update({ semester_id: semesterId })
    .eq("id", classId)
    .select(CLASS_WITH_SUBJECT_SELECT)
    .single();
}
