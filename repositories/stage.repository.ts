import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const STAGE_COLUMNS = "id, name, period, level, sort_order, created_at";

export type StageRecord = {
  id: string;
  name: string;
  period: number;
  level: number;
  sort_order: number;
  created_at: string;
};

export type CreateStageRecordInput = {
  name: string;
  period: number;
  level: number;
  sort_order?: number;
};

export async function listStages(client: Supabase) {
  return client
    .from("stages")
    .select(STAGE_COLUMNS)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
}

export async function findStageById(client: Supabase, id: string) {
  return client
    .from("stages")
    .select(STAGE_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

export async function findStageByName(client: Supabase, name: string) {
  return client
    .from("stages")
    .select("id, name")
    .ilike("name", name)
    .maybeSingle();
}

export async function getNextStageSortOrder(client: Supabase) {
  const { data, error } = await client
    .from("stages")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { data: null as number | null, error };
  }

  return {
    data: (data?.sort_order ?? -1) + 1,
    error: null,
  };
}

export async function createStage(
  client: Supabase,
  input: CreateStageRecordInput
) {
  return client
    .from("stages")
    .insert({
      name: input.name,
      period: input.period,
      level: input.level,
      sort_order: input.sort_order ?? 0,
    })
    .select(STAGE_COLUMNS)
    .single();
}

export async function updateStageSortOrders(
  client: Supabase,
  orderedIds: string[]
) {
  const results = await Promise.all(
    orderedIds.map((id, index) =>
      client.from("stages").update({ sort_order: index }).eq("id", id)
    )
  );

  const firstError = results.find((result) => result.error)?.error ?? null;
  return { error: firstError };
}
