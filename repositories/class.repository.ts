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

export async function listInProgressClasses(client: Supabase) {
  return client
    .from("classes")
    .select("id, name")
    .eq("status", "in_progress")
    .order("name", { ascending: true });
}

export async function listInProgressClassesWithSemester(client: Supabase) {
  return client
    .from("classes")
    .select("id, name, semester_id")
    .eq("status", "in_progress")
    .order("name", { ascending: true });
}

/**
 * Billing batch: all in-progress classes with created_at so callers can pick
 * oldest per semester without N+1 finds.
 */
export async function listInProgressClassesForBilling(client: Supabase) {
  return client
    .from("classes")
    .select("id, name, semester_id, created_at")
    .eq("status", "in_progress")
    .order("created_at", { ascending: true });
}

const CLASS_PICKER_SELECT = "id, name, subjects ( name )";

export type ClassPickerRecord = {
  id: string;
  name: string;
  subjects: { name: string } | null;
};

export async function listClassesWithSubjectForPicker(client: Supabase) {
  return client
    .from("classes")
    .select(CLASS_PICKER_SELECT)
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

/**
 * Billing class for a semester: status = in_progress.
 * If multiple exist, pick oldest created_at (deterministic).
 */
export async function findInProgressClassBySemesterId(
  client: Supabase,
  semesterId: string
) {
  return client
    .from("classes")
    .select(CLASS_COLUMNS)
    .eq("semester_id", semesterId)
    .eq("status", "in_progress")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
}

/** Another in-progress class on the same semester (exclude one class id). */
export async function findOtherInProgressClassBySemesterId(
  client: Supabase,
  semesterId: string,
  excludeClassId: string
) {
  return client
    .from("classes")
    .select(CLASS_COLUMNS)
    .eq("semester_id", semesterId)
    .eq("status", "in_progress")
    .neq("id", excludeClassId)
    .order("created_at", { ascending: true })
    .limit(1)
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

export async function listClassesWithSubjectByIds(
  client: Supabase,
  classIds: string[]
) {
  if (classIds.length === 0) {
    return { data: [], error: null };
  }

  return client
    .from("classes")
    .select(CLASS_WITH_SUBJECT_SELECT)
    .in("id", classIds);
}

export async function listLinkedClassesWithSubject(client: Supabase) {
  return client
    .from("classes")
    .select(CLASS_WITH_SUBJECT_SELECT)
    .not("semester_id", "is", null)
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

const CLASS_DETAIL_SELECT =
  "id, subject_id, name, status, semester_id, created_at, subjects ( name, nb_sessions ), semesters ( name )";

export type ClassDetailRecord = ClassRecord & {
  subjects: { name: string; nb_sessions: number } | null;
  semesters: { name: string } | null;
};

export type UpdateClassRecordInput = {
  name: string;
  subject_id: string;
  status: string;
  semester_id: string | null;
};

export async function findClassDetailById(client: Supabase, id: string) {
  return client
    .from("classes")
    .select(CLASS_DETAIL_SELECT)
    .eq("id", id)
    .maybeSingle();
}

export async function updateClass(
  client: Supabase,
  classId: string,
  input: UpdateClassRecordInput
) {
  return client
    .from("classes")
    .update({
      name: input.name,
      subject_id: input.subject_id,
      status: input.status,
      semester_id: input.semester_id,
    })
    .eq("id", classId)
    .select(CLASS_DETAIL_SELECT)
    .single();
}

export async function updateClassStatus(
  client: Supabase,
  classId: string,
  status: string
) {
  return client
    .from("classes")
    .update({ status })
    .eq("id", classId)
    .select(CLASS_DETAIL_SELECT)
    .single();
}

export type CreateClassRecordInput = {
  name: string;
  subject_id: string;
  status: string;
  semester_id: string | null;
};

export async function listClassDetails(client: Supabase) {
  return client
    .from("classes")
    .select(CLASS_DETAIL_SELECT)
    .order("created_at", { ascending: false });
}

export async function createClass(
  client: Supabase,
  input: CreateClassRecordInput
) {
  return client
    .from("classes")
    .insert({
      name: input.name,
      subject_id: input.subject_id,
      status: input.status,
      semester_id: input.semester_id,
    })
    .select(CLASS_DETAIL_SELECT)
    .single();
}
