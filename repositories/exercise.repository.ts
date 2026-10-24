import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;
type ExerciseLevel = Database["public"]["Enums"]["exercise_level"];
type ExerciseStatus = Database["public"]["Enums"]["exercise_status"];

const EXERCISE_COLUMNS =
  "id, title, body, level, status, categories, created_at, updated_at";

export type ExerciseRecord = {
  id: string;
  title: string;
  body: Json;
  level: ExerciseLevel;
  status: ExerciseStatus;
  categories: string[];
  created_at: string;
  updated_at: string;
};

export type CreateExerciseRecordInput = {
  title: string;
  body: Json;
  level: ExerciseLevel;
  status: ExerciseStatus;
  categories: string[];
};

export type UpdateExerciseRecordInput = CreateExerciseRecordInput;

export async function listExercises(client: Supabase) {
  return client
    .from("exercises")
    .select(EXERCISE_COLUMNS)
    .order("created_at", { ascending: false });
}

export async function findExerciseById(client: Supabase, id: string) {
  return client
    .from("exercises")
    .select(EXERCISE_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

export async function findExercisesByIds(client: Supabase, ids: string[]) {
  if (ids.length === 0) {
    return { data: [] as ExerciseRecord[], error: null };
  }

  return client.from("exercises").select(EXERCISE_COLUMNS).in("id", ids);
}

export async function createExercise(
  client: Supabase,
  input: CreateExerciseRecordInput
) {
  return client
    .from("exercises")
    .insert({
      title: input.title,
      body: input.body,
      level: input.level,
      status: input.status,
      categories: input.categories,
    })
    .select(EXERCISE_COLUMNS)
    .single();
}

export async function updateExerciseById(
  client: Supabase,
  id: string,
  input: UpdateExerciseRecordInput
) {
  return client
    .from("exercises")
    .update({
      title: input.title,
      body: input.body,
      level: input.level,
      status: input.status,
      categories: input.categories,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(EXERCISE_COLUMNS)
    .single();
}

export async function updateExerciseCategoriesById(
  client: Supabase,
  id: string,
  categories: string[]
) {
  return client
    .from("exercises")
    .update({
      categories,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
}

export async function deleteExerciseById(client: Supabase, id: string) {
  return client.from("exercises").delete().eq("id", id);
}

export async function countSubjectExercises(
  client: Supabase,
  exerciseId: string
) {
  return client
    .from("subject_exercises")
    .select("exercise_id", { count: "exact", head: true })
    .eq("exercise_id", exerciseId);
}

export async function countCategoryExercisesForExercise(
  client: Supabase,
  exerciseId: string
) {
  return client
    .from("category_exercises")
    .select("exercise_id", { count: "exact", head: true })
    .eq("exercise_id", exerciseId);
}

export async function listSubjectExerciseIds(
  client: Supabase,
  subjectId: string
) {
  return client
    .from("subject_exercises")
    .select("exercise_id")
    .eq("subject_id", subjectId);
}

export async function replaceSubjectExercises(
  client: Supabase,
  subjectId: string,
  exerciseIds: string[]
) {
  const { error: deleteError } = await client
    .from("subject_exercises")
    .delete()
    .eq("subject_id", subjectId);

  if (deleteError) {
    return { error: deleteError };
  }

  if (exerciseIds.length === 0) {
    return { error: null };
  }

  return client.from("subject_exercises").insert(
    exerciseIds.map((exercise_id) => ({
      subject_id: subjectId,
      exercise_id,
    }))
  );
}
