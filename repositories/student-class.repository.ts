import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export async function countStudentClassesByUserId(
  client: Supabase,
  userId: string
) {
  return client
    .from("student_class")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
}

export async function countStudentClassesByUserIdAndStatus(
  client: Supabase,
  userId: string,
  status: string
) {
  return client
    .from("student_class")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", status);
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
