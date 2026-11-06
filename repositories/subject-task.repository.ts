import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const SUBJECT_TASK_COLUMNS =
  "id, subject_id, title, description, period, max_grade, is_yes_no, sort_order, created_at, updated_at";

export type SubjectTaskRecord = {
  id: string;
  subject_id: string;
  title: string;
  description: string | null;
  period: number;
  max_grade: number | null;
  is_yes_no: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type CreateSubjectTaskInput = {
  subject_id: string;
  title: string;
  description?: string | null;
  period: number;
  max_grade?: number | null;
  is_yes_no?: boolean;
  sort_order?: number;
};

export type UpdateSubjectTaskInput = {
  title: string;
  description?: string | null;
  period: number;
  max_grade?: number | null;
  is_yes_no?: boolean;
  sort_order: number;
};

export async function listSubjectTasksBySubjectId(
  client: Supabase,
  subjectId: string
) {
  return client
    .from("subject_tasks")
    .select(SUBJECT_TASK_COLUMNS)
    .eq("subject_id", subjectId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
}

export async function findSubjectTaskById(client: Supabase, id: string) {
  return client
    .from("subject_tasks")
    .select(SUBJECT_TASK_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

export async function createSubjectTask(
  client: Supabase,
  input: CreateSubjectTaskInput
) {
  return client
    .from("subject_tasks")
    .insert({
      subject_id: input.subject_id,
      title: input.title,
      description: input.description ?? null,
      period: input.period,
      max_grade: input.max_grade ?? null,
      is_yes_no: input.is_yes_no ?? false,
      sort_order: input.sort_order ?? 0,
    })
    .select(SUBJECT_TASK_COLUMNS)
    .single();
}

export async function updateSubjectTaskById(
  client: Supabase,
  id: string,
  input: UpdateSubjectTaskInput
) {
  return client
    .from("subject_tasks")
    .update({
      title: input.title,
      description: input.description ?? null,
      period: input.period,
      max_grade: input.max_grade ?? null,
      ...(input.is_yes_no === undefined ? {} : { is_yes_no: input.is_yes_no }),
      sort_order: input.sort_order,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(SUBJECT_TASK_COLUMNS)
    .single();
}

export async function deleteSubjectTaskById(client: Supabase, id: string) {
  return client.from("subject_tasks").delete().eq("id", id);
}
