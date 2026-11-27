import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const TEAM_COLUMNS = "id, name, sort_order, created_at";

export type SemesterTeamRecord = {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
};

export type CreateSemesterTeamRecordInput = {
  name: string;
  sort_order?: number;
};

export async function listSemesterTeams(client: Supabase) {
  return client
    .from("semester_teams")
    .select(TEAM_COLUMNS)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
}

export async function findSemesterTeamById(client: Supabase, id: string) {
  return client
    .from("semester_teams")
    .select(TEAM_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

export async function findSemesterTeamByName(client: Supabase, name: string) {
  return client
    .from("semester_teams")
    .select("id, name")
    .ilike("name", name)
    .maybeSingle();
}

export async function getNextSemesterTeamSortOrder(client: Supabase) {
  const { data, error } = await client
    .from("semester_teams")
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

export async function createSemesterTeam(
  client: Supabase,
  input: CreateSemesterTeamRecordInput
) {
  return client
    .from("semester_teams")
    .insert({
      name: input.name,
      sort_order: input.sort_order ?? 0,
    })
    .select(TEAM_COLUMNS)
    .single();
}

export async function updateSemesterTeamSortOrders(
  client: Supabase,
  orderedIds: string[]
) {
  // N+1 updates: no batch RPC sibling exists (same pattern as stages /
  // semesters). Partial failure can leave earlier rows committed.
  const results = await Promise.all(
    orderedIds.map((id, index) =>
      client.from("semester_teams").update({ sort_order: index }).eq("id", id)
    )
  );

  const firstError = results.find((result) => result.error)?.error ?? null;
  return { error: firstError };
}
