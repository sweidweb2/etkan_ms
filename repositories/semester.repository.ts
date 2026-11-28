import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { chunkedIn } from "@/repositories/_shared/chunked-in";
import { collectAllPages } from "@/repositories/_shared/collect-all-pages";
import type { Database, Json } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const SEMESTER_COLUMNS =
  "id, name, semester_code, created_at, team_id, sort_order";

export type SemesterRecord = {
  id: string;
  name: string;
  semester_code: string;
  created_at: string | null;
  team_id: string | null;
  sort_order: number;
};

export type CreateSemesterRecordInput = {
  name: string;
  semester_code: string;
};

export type UpdateSemesterRecordInput = {
  name: string;
  semester_code: string;
};

export async function listSemesters(client: Supabase) {
  return collectAllPages<SemesterRecord>((offset, limit) =>
    client
      .from("semesters")
      .select(SEMESTER_COLUMNS)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)
  );
}

export async function findSemesterById(client: Supabase, id: string) {
  return client
    .from("semesters")
    .select(SEMESTER_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

export async function listSemestersByIds(client: Supabase, ids: string[]) {
  if (ids.length === 0) {
    return { data: [] as SemesterRecord[], error: null };
  }
  return chunkedIn(ids, (chunk) =>
    client.from("semesters").select(SEMESTER_COLUMNS).in("id", chunk)
  );
}

export type SemesterPaymentPhasePickerRecord = {
  id: string;
  name: string;
  semester_code: string;
};

export async function listSemestersForPaymentPhasePicker(client: Supabase) {
  return client
    .from("semesters")
    .select("id, name, semester_code")
    .not("semester_code", "is", null)
    .order("name", { ascending: true });
}

export async function findSemesterByName(client: Supabase, name: string) {
  return client
    .from("semesters")
    .select("id, name")
    .ilike("name", name)
    .maybeSingle();
}

export async function findSemesterByCode(client: Supabase, semesterCode: string) {
  return client
    .from("semesters")
    .select("id, semester_code")
    .eq("semester_code", semesterCode)
    .maybeSingle();
}

export async function createSemester(
  client: Supabase,
  input: CreateSemesterRecordInput
) {
  return client
    .from("semesters")
    .insert({
      name: input.name,
      semester_code: input.semester_code,
    })
    .select(SEMESTER_COLUMNS)
    .single();
}

export async function updateSemester(
  client: Supabase,
  id: string,
  input: UpdateSemesterRecordInput
) {
  return client
    .from("semesters")
    .update({
      name: input.name,
      semester_code: input.semester_code,
    })
    .eq("id", id)
    .select(SEMESTER_COLUMNS)
    .single();
}

export async function updateSemesterBoardPositions(
  client: Supabase,
  placements: Array<{
    id: string;
    team_id: string | null;
    sort_order: number;
  }>
) {
  const { error } = await client.rpc("update_semester_board_positions", {
    p_placements: placements as Json,
  });
  return { error };
}

/** Atomically assign semesters onto a team with locked next sort_order. */
export async function assignSemestersToTeam(
  client: Supabase,
  teamId: string | null,
  semesterIds: string[]
) {
  const { error } = await client.rpc("assign_semesters_to_team", {
    p_team_id: teamId,
    p_semester_ids: semesterIds,
  });
  return { error };
}
