import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const STUDENT_CLASS_COLUMNS = "id, user_id, class_id, joined_at";

export type StudentClassRecord = {
  id: string;
  user_id: string;
  class_id: string;
  joined_at: string | null;
};

export type CreateStudentClassInput = {
  user_id: string;
  class_id: string;
};

export async function countStudentClassesByUserId(
  client: Supabase,
  userId: string
) {
  return client
    .from("student_class")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
}

export async function listStudentClassCountsByClassIds(
  client: Supabase,
  classIds: string[]
) {
  if (classIds.length === 0) {
    return { data: [], error: null };
  }

  return client.from("student_class").select("class_id").in("class_id", classIds);
}

export async function listStudentClassEnrollments(client: Supabase) {
  return client.from("student_class").select("class_id, user_id");
}

export async function listStudentClassesByClassId(
  client: Supabase,
  classId: string
) {
  return client
    .from("student_class")
    .select(STUDENT_CLASS_COLUMNS)
    .eq("class_id", classId)
    .order("joined_at", { ascending: false });
}

export async function listStudentClassesByUserId(
  client: Supabase,
  userId: string
) {
  return client
    .from("student_class")
    .select(STUDENT_CLASS_COLUMNS)
    .eq("user_id", userId)
    .order("joined_at", { ascending: false });
}

export async function listStudentUserIdsByClassId(
  client: Supabase,
  classId: string
) {
  return client.from("student_class").select("user_id").eq("class_id", classId);
}

/** All members of a class (binary membership: any student_class row). */
export async function listMemberUserIdsByClassId(
  client: Supabase,
  classId: string
) {
  return client
    .from("student_class")
    .select("user_id")
    .eq("class_id", classId);
}

/** All members of the given classes (binary membership). */
export async function listMemberUserIdsByClassIds(
  client: Supabase,
  classIds: string[]
) {
  if (classIds.length === 0) {
    return { data: [], error: null };
  }

  return client
    .from("student_class")
    .select("user_id, class_id")
    .in("class_id", classIds);
}

export async function findStudentClassByUserAndClass(
  client: Supabase,
  userId: string,
  classId: string
) {
  return client
    .from("student_class")
    .select(STUDENT_CLASS_COLUMNS)
    .eq("user_id", userId)
    .eq("class_id", classId)
    .maybeSingle();
}

export async function createStudentClassEnrollment(
  client: Supabase,
  input: CreateStudentClassInput
) {
  return client
    .from("student_class")
    .insert({
      user_id: input.user_id,
      class_id: input.class_id,
    })
    .select(STUDENT_CLASS_COLUMNS)
    .single();
}

export async function findStudentClassById(client: Supabase, id: string) {
  return client
    .from("student_class")
    .select(STUDENT_CLASS_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

export async function deleteStudentClassById(client: Supabase, id: string) {
  return client
    .from("student_class")
    .delete()
    .eq("id", id)
    .select(STUDENT_CLASS_COLUMNS)
    .maybeSingle();
}

export async function countStudentClassesByClassId(
  client: Supabase,
  classId: string
) {
  return client
    .from("student_class")
    .select("id", { count: "exact", head: true })
    .eq("class_id", classId);
}
