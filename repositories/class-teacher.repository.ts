import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const CLASS_TEACHER_COLUMNS =
  "id, teacher_id, class_id, assigned_by, assigned_at";

export type ClassTeacherRecord = {
  id: string;
  teacher_id: string;
  class_id: string;
  assigned_by: string | null;
  assigned_at: string | null;
};

export async function countClassTeachersByClassId(
  client: Supabase,
  classId: string
) {
  return client
    .from("class_teacher")
    .select("id", { count: "exact", head: true })
    .eq("class_id", classId);
}

export async function listClassTeacherCountsByClassIds(
  client: Supabase,
  classIds: string[]
) {
  if (classIds.length === 0) {
    return { data: [], error: null };
  }

  return client.from("class_teacher").select("class_id").in("class_id", classIds);
}

export async function listClassTeachersByClassId(
  client: Supabase,
  classId: string
) {
  return client
    .from("class_teacher")
    .select(CLASS_TEACHER_COLUMNS)
    .eq("class_id", classId)
    .order("assigned_at", { ascending: false });
}

export async function findClassTeacherByTeacherAndClass(
  client: Supabase,
  teacherId: string,
  classId: string
) {
  return client
    .from("class_teacher")
    .select(CLASS_TEACHER_COLUMNS)
    .eq("teacher_id", teacherId)
    .eq("class_id", classId)
    .maybeSingle();
}

export async function createClassTeacher(
  client: Supabase,
  input: {
    teacher_id: string;
    class_id: string;
    assigned_by?: string | null;
  }
) {
  return client
    .from("class_teacher")
    .insert({
      teacher_id: input.teacher_id,
      class_id: input.class_id,
      assigned_by: input.assigned_by ?? null,
    })
    .select(CLASS_TEACHER_COLUMNS)
    .single();
}

export async function deleteClassTeacherById(client: Supabase, id: string) {
  return client.from("class_teacher").delete().eq("id", id);
}

export async function listClassTeacherAssignments(client: Supabase) {
  return client.from("class_teacher").select("class_id, teacher_id");
}
