import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;
type ClassCategoryStatus = Database["public"]["Enums"]["class_category_status"];

const COLUMNS = "id, class_id, category_id, status, created_at, updated_at";

export type ClassCategoryRecord = {
  id: string;
  class_id: string;
  category_id: string;
  status: ClassCategoryStatus;
  created_at: string;
  updated_at: string;
};

export async function listClassCategoriesByClassId(
  client: Supabase,
  classId: string
) {
  return client
    .from("class_categories")
    .select(COLUMNS)
    .eq("class_id", classId);
}

export async function deleteClassCategoriesByClassId(
  client: Supabase,
  classId: string
) {
  return client.from("class_categories").delete().eq("class_id", classId);
}

export async function insertClassCategories(
  client: Supabase,
  rows: Array<{
    class_id: string;
    category_id: string;
    status: ClassCategoryStatus;
  }>
) {
  if (rows.length === 0) {
    return { data: [], error: null };
  }

  return client.from("class_categories").insert(rows).select(COLUMNS);
}
