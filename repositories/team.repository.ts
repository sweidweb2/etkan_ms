import type { SupabaseClient } from "@supabase/supabase-js";
import type { TeamStatus } from "@/lib/constants/team";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const TEAM_COLUMNS =
  "id, name, expected_start_date, status, created_by, created_at, updated_at";

export type TeamRecord = {
  id: string;
  name: string;
  expected_start_date: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type TeamGuestRecord = {
  id: string;
  team_id: string;
  guest_id: string;
  created_at: string;
};

export type CreateTeamRecordInput = {
  name: string;
  expected_start_date: string | null;
  status: TeamStatus;
  created_by: string | null;
};

export type UpdateTeamRecordInput = {
  name: string;
  expected_start_date: string | null;
  status: TeamStatus;
};

export async function listTeams(client: Supabase) {
  return client
    .from("teams")
    .select(TEAM_COLUMNS)
    .order("created_at", { ascending: false });
}

export async function findTeamById(client: Supabase, id: string) {
  return client.from("teams").select(TEAM_COLUMNS).eq("id", id).maybeSingle();
}

export async function createTeam(
  client: Supabase,
  input: CreateTeamRecordInput
) {
  return client
    .from("teams")
    .insert({
      name: input.name,
      expected_start_date: input.expected_start_date,
      status: input.status,
      created_by: input.created_by,
    })
    .select(TEAM_COLUMNS)
    .single();
}

export async function updateTeam(
  client: Supabase,
  id: string,
  input: UpdateTeamRecordInput
) {
  return client
    .from("teams")
    .update({
      name: input.name,
      expected_start_date: input.expected_start_date,
      status: input.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(TEAM_COLUMNS)
    .single();
}

export async function deleteTeamById(client: Supabase, id: string) {
  return client.from("teams").delete().eq("id", id);
}

export async function listTeamGuests(client: Supabase) {
  return client
    .from("team_guests")
    .select("id, team_id, guest_id, created_at")
    .order("created_at", { ascending: true });
}

export async function findTeamGuestByGuestId(client: Supabase, guestId: string) {
  return client
    .from("team_guests")
    .select("id, team_id, guest_id, created_at")
    .eq("guest_id", guestId)
    .maybeSingle();
}

/** Upsert on the unique guest_id so a move between teams is a single write. */
export async function assignGuestToTeam(
  client: Supabase,
  input: { teamId: string; guestId: string; createdBy: string | null }
) {
  return client
    .from("team_guests")
    .upsert(
      {
        team_id: input.teamId,
        guest_id: input.guestId,
        created_by: input.createdBy,
      },
      { onConflict: "guest_id" }
    )
    .select("id, team_id, guest_id, created_at")
    .single();
}

export async function removeGuestFromTeam(client: Supabase, guestId: string) {
  return client.from("team_guests").delete().eq("guest_id", guestId);
}
