import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

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
  return client
    .from("semesters")
    .select(SEMESTER_COLUMNS)
    .order("created_at", { ascending: false });
}

export async function findSemesterById(client: Supabase, id: string) {
  return client
    .from("semesters")
    .select(SEMESTER_COLUMNS)
    .eq("id", id)
    .maybeSingle();
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

export async function updateSemesterTeamById(
  client: Supabase,
  id: string,
  teamId: string | null,
  sortOrder?: number
) {
  return client
    .from("semesters")
    .update({
      team_id: teamId,
      ...(typeof sortOrder === "number" ? { sort_order: sortOrder } : {}),
    })
    .eq("id", id)
    .select(SEMESTER_COLUMNS)
    .single();
}

export async function updateSemestersTeamByIds(
  client: Supabase,
  ids: string[],
  teamId: string | null
) {
  return client
    .from("semesters")
    .update({ team_id: teamId })
    .in("id", ids)
    .select(SEMESTER_COLUMNS);
}

export async function updateSemesterBoardPositions(
  client: Supabase,
  placements: Array<{
    id: string;
    team_id: string | null;
    sort_order: number;
  }>
) {
  const results = await Promise.all(
    placements.map((placement) =>
      client
        .from("semesters")
        .update({
          team_id: placement.team_id,
          sort_order: placement.sort_order,
        })
        .eq("id", placement.id)
    )
  );

  const firstError = results.find((result) => result.error)?.error ?? null;
  return { error: firstError };
}

export async function getNextSemesterSortOrderForTeam(
  client: Supabase,
  teamId: string | null
) {
  let query = client
    .from("semesters")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);

  query =
    teamId === null
      ? query.is("team_id", null)
      : query.eq("team_id", teamId);

  const { data, error } = await query.maybeSingle();

  if (error) {
    return { data: null as number | null, error };
  }

  return {
    data: (data?.sort_order ?? -1) + 1,
    error: null,
  };
}
