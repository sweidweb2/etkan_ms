import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const CATEGORY_COLUMNS = "id, parent_id, name, created_at, updated_at";

export type CategoryRecord = {
  id: string;
  parent_id: string | null;
  name: string;
  created_at: string;
  updated_at: string;
};

export async function listCategories(client: Supabase) {
  return client
    .from("categories")
    .select(CATEGORY_COLUMNS)
    .order("name", { ascending: true });
}

export async function findCategoryById(client: Supabase, id: string) {
  return client
    .from("categories")
    .select(CATEGORY_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

export async function findCategoriesByIds(client: Supabase, ids: string[]) {
  if (ids.length === 0) {
    return { data: [] as CategoryRecord[], error: null };
  }

  return client.from("categories").select(CATEGORY_COLUMNS).in("id", ids);
}

export async function createCategory(
  client: Supabase,
  input: { name: string; parent_id: string | null }
) {
  return client
    .from("categories")
    .insert({
      name: input.name,
      parent_id: input.parent_id,
    })
    .select(CATEGORY_COLUMNS)
    .single();
}

export async function updateCategoryById(
  client: Supabase,
  id: string,
  input: { name: string; parent_id: string | null }
) {
  return client
    .from("categories")
    .update({
      name: input.name,
      parent_id: input.parent_id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(CATEGORY_COLUMNS)
    .single();
}

export async function deleteCategoryById(client: Supabase, id: string) {
  return client.from("categories").delete().eq("id", id);
}

export async function countCategoryExercises(
  client: Supabase,
  categoryId: string
) {
  return client
    .from("category_exercises")
    .select("category_id", { count: "exact", head: true })
    .eq("category_id", categoryId);
}

export async function countSubjectCategories(
  client: Supabase,
  categoryId: string
) {
  return client
    .from("subject_categories")
    .select("category_id", { count: "exact", head: true })
    .eq("category_id", categoryId);
}

export async function listSubjectCategoryIds(
  client: Supabase,
  subjectId: string
) {
  return client
    .from("subject_categories")
    .select("category_id")
    .eq("subject_id", subjectId);
}

export async function replaceSubjectCategories(
  client: Supabase,
  subjectId: string,
  categoryIds: string[]
) {
  const { error: deleteError } = await client
    .from("subject_categories")
    .delete()
    .eq("subject_id", subjectId);

  if (deleteError) {
    return { error: deleteError };
  }

  if (categoryIds.length === 0) {
    return { error: null };
  }

  return client.from("subject_categories").insert(
    categoryIds.map((category_id) => ({
      subject_id: subjectId,
      category_id,
    }))
  );
}

export async function listCategoryExerciseLinksByExerciseId(
  client: Supabase,
  exerciseId: string
) {
  return client
    .from("category_exercises")
    .select("category_id")
    .eq("exercise_id", exerciseId);
}

export async function listCategoryExerciseLinksByExerciseIds(
  client: Supabase,
  exerciseIds: string[]
) {
  if (exerciseIds.length === 0) {
    return { data: [] as Array<{ category_id: string; exercise_id: string }>, error: null };
  }

  return client
    .from("category_exercises")
    .select("category_id, exercise_id")
    .in("exercise_id", exerciseIds);
}

export async function replaceCategoryExercisesForExercise(
  client: Supabase,
  exerciseId: string,
  categoryIds: string[]
) {
  const { error: deleteError } = await client
    .from("category_exercises")
    .delete()
    .eq("exercise_id", exerciseId);

  if (deleteError) {
    return { error: deleteError };
  }

  if (categoryIds.length === 0) {
    return { error: null };
  }

  return client.from("category_exercises").insert(
    categoryIds.map((category_id) => ({
      category_id,
      exercise_id: exerciseId,
    }))
  );
}

export async function listExercisesUsingCategoryName(
  client: Supabase,
  categoryName: string
) {
  return client
    .from("exercises")
    .select("id, categories")
    .contains("categories", [categoryName]);
}
