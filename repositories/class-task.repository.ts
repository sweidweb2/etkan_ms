import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const CLASS_TASK_COLUMNS =
  "id, class_id, source_subject_task_id, title, description, period, max_grade, is_yes_no, sort_order, started, started_at, due_date, created_at, updated_at, created_by, updated_by";

const CLASS_TASK_FOR_GRADES_COLUMNS =
  "id, class_id, title, max_grade, is_yes_no, due_date, sort_order, created_at";

export type ClassTaskRecord = {
  id: string;
  class_id: string;
  source_subject_task_id: string | null;
  title: string;
  description: string | null;
  period: number;
  max_grade: number | null;
  is_yes_no: boolean;
  sort_order: number;
  started: boolean;
  started_at: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

export type CreateClassTaskInput = {
  class_id: string;
  source_subject_task_id?: string | null;
  title: string;
  description?: string | null;
  period: number;
  max_grade?: number | null;
  is_yes_no?: boolean;
  sort_order?: number;
  started?: boolean;
  started_at?: string | null;
  due_date?: string | null;
  created_by?: string | null;
};

export type UpdateClassTaskInput = {
  title: string;
  description?: string | null;
  period: number;
  max_grade?: number | null;
  is_yes_no?: boolean;
  sort_order: number;
  updated_by?: string | null;
};

export type ClassTaskStartStateInput = {
  started: boolean;
  started_at: string | null;
  due_date: string | null;
  updated_by?: string | null;
};

export async function listClassTasksByClassId(client: Supabase, classId: string) {
  return client
    .from("class_tasks")
    .select(CLASS_TASK_COLUMNS)
    .eq("class_id", classId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
}

export async function listClassTasksForGradesByClassId(
  client: Supabase,
  classId: string
) {
  return client
    .from("class_tasks")
    .select(CLASS_TASK_FOR_GRADES_COLUMNS)
    .eq("class_id", classId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
}

export async function listClassTasksForGradesByClassIds(
  client: Supabase,
  classIds: string[]
) {
  if (classIds.length === 0) {
    return { data: [], error: null };
  }

  return client
    .from("class_tasks")
    .select(CLASS_TASK_FOR_GRADES_COLUMNS)
    .in("class_id", classIds)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
}

export async function listClassTaskIdsByClassId(client: Supabase, classId: string) {
  return client
    .from("class_tasks")
    .select("id, max_grade, is_yes_no, due_date")
    .eq("class_id", classId);
}

export async function findClassTaskById(client: Supabase, id: string) {
  return client
    .from("class_tasks")
    .select(CLASS_TASK_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

export async function listSourceSubjectTaskIdsForClass(
  client: Supabase,
  classId: string
) {
  return client
    .from("class_tasks")
    .select("source_subject_task_id")
    .eq("class_id", classId)
    .not("source_subject_task_id", "is", null);
}

export async function createClassTask(
  client: Supabase,
  input: CreateClassTaskInput
) {
  return client
    .from("class_tasks")
    .insert({
      class_id: input.class_id,
      source_subject_task_id: input.source_subject_task_id ?? null,
      title: input.title,
      description: input.description ?? null,
      period: input.period,
      max_grade: input.max_grade ?? null,
      is_yes_no: input.is_yes_no ?? false,
      sort_order: input.sort_order ?? 0,
      started: input.started ?? false,
      started_at: input.started_at ?? null,
      due_date: input.due_date ?? null,
      created_by: input.created_by ?? null,
      updated_by: input.created_by ?? null,
    })
    .select(CLASS_TASK_COLUMNS)
    .single();
}

export async function createClassTasks(
  client: Supabase,
  rows: CreateClassTaskInput[]
) {
  if (rows.length === 0) {
    return { data: [] as ClassTaskRecord[], error: null };
  }

  return client
    .from("class_tasks")
    .insert(
      rows.map((input) => ({
        class_id: input.class_id,
        source_subject_task_id: input.source_subject_task_id ?? null,
        title: input.title,
        description: input.description ?? null,
        period: input.period,
        max_grade: input.max_grade ?? null,
        is_yes_no: input.is_yes_no ?? false,
        sort_order: input.sort_order ?? 0,
        started: input.started ?? false,
        started_at: input.started_at ?? null,
        due_date: input.due_date ?? null,
        created_by: input.created_by ?? null,
        updated_by: input.created_by ?? null,
      }))
    )
    .select(CLASS_TASK_COLUMNS);
}

export async function updateClassTaskById(
  client: Supabase,
  id: string,
  input: UpdateClassTaskInput
) {
  return client
    .from("class_tasks")
    .update({
      title: input.title,
      description: input.description ?? null,
      period: input.period,
      max_grade: input.max_grade ?? null,
      ...(input.is_yes_no === undefined ? {} : { is_yes_no: input.is_yes_no }),
      sort_order: input.sort_order,
      ...(input.updated_by === undefined ? {} : { updated_by: input.updated_by }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(CLASS_TASK_COLUMNS)
    .single();
}

export async function updateClassTaskStartState(
  client: Supabase,
  id: string,
  input: ClassTaskStartStateInput
) {
  return client
    .from("class_tasks")
    .update({
      started: input.started,
      started_at: input.started_at,
      due_date: input.due_date,
      ...(input.updated_by === undefined ? {} : { updated_by: input.updated_by }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(CLASS_TASK_COLUMNS)
    .single();
}

export async function deleteClassTaskById(client: Supabase, id: string) {
  return client.from("class_tasks").delete().eq("id", id);
}

export async function deleteClassTasksByClassId(client: Supabase, classId: string) {
  return client.from("class_tasks").delete().eq("class_id", classId);
}
