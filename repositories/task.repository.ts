import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export async function listTasksBySessionIds(
  client: Supabase,
  sessionIds: string[]
) {
  if (sessionIds.length === 0) {
    return { data: [], error: null };
  }

  return client
    .from("tasks")
    .select("id, session_id, max_grade")
    .in("session_id", sessionIds);
}

export async function listStudentTasksByTaskIds(
  client: Supabase,
  taskIds: string[]
) {
  if (taskIds.length === 0) {
    return { data: [], error: null };
  }

  return client
    .from("student_tasks")
    .select("task_id, grade, status")
    .in("task_id", taskIds);
}
