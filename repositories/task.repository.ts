import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const TASK_COLUMNS =
  "id, session_id, title, description, due_date, max_grade, created_at";

export type TaskRecord = {
  id: string;
  session_id: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  max_grade: number | null;
  created_at: string | null;
};

export type CreateTaskInput = {
  session_id: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  max_grade?: number | null;
};

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

export async function listTasksForGradesBySessionIds(
  client: Supabase,
  sessionIds: string[]
) {
  if (sessionIds.length === 0) {
    return { data: [], error: null };
  }

  return client
    .from("tasks")
    .select("id, session_id, title, max_grade, due_date, created_at")
    .in("session_id", sessionIds)
    .order("created_at", { ascending: true });
}

export async function listTasksBySessionId(client: Supabase, sessionId: string) {
  return client
    .from("tasks")
    .select(TASK_COLUMNS)
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
}

export async function findTaskById(client: Supabase, id: string) {
  return client
    .from("tasks")
    .select(TASK_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

export async function createTask(client: Supabase, input: CreateTaskInput) {
  return client
    .from("tasks")
    .insert({
      session_id: input.session_id,
      title: input.title,
      description: input.description ?? null,
      due_date: input.due_date ?? null,
      max_grade: input.max_grade ?? null,
    })
    .select(TASK_COLUMNS)
    .single();
}

